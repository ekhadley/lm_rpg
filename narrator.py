import os
import json
from utils import getFullStoryInstruction, loadAllPreviousHistory
from model_tools import Toolbox, SYSTEM_TOOLBOXES
from callbacks import WebCallbackHandler
from openrouter import OpenRouterProvider
from history import TurnTree
from flask_socketio import SocketIO
    
class Narrator:
    def __init__(self, model_name: str, story_id: str, system_name: str, socket: SocketIO, cache_mode: str = "1h"):
        self.model_name: str = model_name
        self.system_name: str = system_name
        self.story_id: str = story_id
        self.tb: Toolbox = SYSTEM_TOOLBOXES[system_name](story_id, system_name)
        self.socket: SocketIO = socket
        self.system_prompt = getFullStoryInstruction(system_name, story_id)
        self.story_history_path = f"./stories/{story_id}/history.json"
        self.thinking_effort = "max"
        self.tree = TurnTree.empty()

        self.provider = OpenRouterProvider(
            model_name=model_name,
            thinking_effort=self.thinking_effort,
            cache_mode=cache_mode,
            toolbox=self.tb,
            callback_handler=WebCallbackHandler(socket)
        )

    def _systemMessage(self) -> dict:
        # Re-read instruction/story files live so mid-conversation edits take effect on the next turn (incl. retry/edit).
        self.system_prompt = getFullStoryInstruction(self.system_name, self.story_id)
        block = {"type": "text", "text": self.system_prompt}
        if self.provider.cacheControl():
            block["cache_control"] = self.provider.cacheControl()
        return {"role": "system", "content": [block]}

    def setCacheMode(self, mode: str) -> None:
        self.provider.cache_mode = mode
        self._rebuildContext()  # refresh the system message's cache_control

    def _rebuildContext(self):
        """Set the provider's flat message list to [system] + the active branch."""
        self.provider.messages = [self._systemMessage()] + self.tree.active_messages()
        self.provider.recompute_usage_from_messages(self.provider.messages)

    # === Per-turn file snapshots ===========================================
    # File state is a function of the active node. Each assistant turn records the full contents
    # of the files it changed (a delta); a node's full state is reconstructed by replaying deltas
    # root→node (TurnTree.file_state_at). Story files live in the story dir and are materialized
    # back to disk on rollback/branch-switch. The shared instruction files (core.md, {system}.md)
    # are tracked too — keyed by their 'instructions/...' path so they never collide with story
    # files — but never written back to disk (they are shared across stories); the live-read in
    # _systemMessage handles them. They are assumed to exist for the whole history (missing = fatal).

    def _instructionFiles(self) -> list[str]:
        return ["instructions/core.md", f"instructions/{self.system_name}.md"]

    def _snapshotDisk(self) -> dict[str, str]:
        """Full contents of every tracked file: story .md files (keyed by bare name) plus the
        shared instruction files (keyed by 'instructions/...')."""
        snap: dict[str, str] = {}
        story_dir = f"./stories/{self.story_id}"
        for f in sorted(os.listdir(story_dir)):
            if f.endswith(".md"):
                with open(os.path.join(story_dir, f)) as fh:
                    snap[f] = fh.read()
        for path in self._instructionFiles():
            with open(path) as fh:
                snap[path] = fh.read()
        return snap

    @staticmethod
    def _diffFiles(before: dict, after: dict) -> dict:
        """Files created/changed (full new contents) plus tombstones (None) for deletions."""
        delta = {f: after[f] for f in after if after.get(f) != before.get(f)}
        delta.update({f: None for f in before if f not in after})
        return delta

    def _writeStoryFiles(self, state: dict) -> None:
        """Make the story dir's .md files exactly match the story-file portion of `state`
        (instruction keys contain '/' and are ignored — they are never written to disk)."""
        story_dir = f"./stories/{self.story_id}"
        story_state = {k: v for k, v in state.items() if "/" not in k}
        for f in [f for f in os.listdir(story_dir) if f.endswith(".md")]:
            if f not in story_state:
                os.remove(os.path.join(story_dir, f))
        for f, contents in story_state.items():
            with open(os.path.join(story_dir, f), "w") as fh:
                fh.write(contents)

    def _restoreFor(self, base_id) -> dict:
        """Rewind disk story files to base_id's state so an upcoming re-run reads the correct
        branch. Returns the reconstructed state (the diff baseline). Legacy nodes carry no file
        records → empty state → leave disk untouched (never wipe)."""
        state = self.tree.file_state_at(base_id)
        if state:
            self._writeStoryFiles(state)
        return state

    def _materialize(self, node_id) -> None:
        """Make the world match a node: restore its story files to disk, then rebuild context
        (the live-read in _systemMessage picks up the restored files). Used by pure-navigation
        ops (branch-switch, rollback) that don't re-run the model."""
        self._restoreFor(node_id)
        self._rebuildContext()

    def saveMessages(self):
        with open(self.story_history_path, "w+") as f:
            json.dump({"model_name": self.model_name, "system_name": self.system_name, **self.tree.serialize()}, f, indent=4)

    def loadMessages(self) -> TurnTree | None:
        if not os.path.exists(self.story_history_path):
            return None
        with open(self.story_history_path) as f:
            data = json.load(f)
        if "nodes" in data:
            self.tree = TurnTree.deserialize(data)
        elif "messages" in data:
            self.tree = TurnTree.migrate_from_flat(data["messages"])
        else:
            return None
        self._rebuildContext()
        return self.tree

    def clearMessages(self):
        """Reset to an empty tree. Used after summarization."""
        self.tree = TurnTree.empty()
        self._rebuildContext()

    def _emitHistory(self):
        self.socket.emit('conversation_history', self._transformTreeForFrontend())

    def _runIntoTurn(self, parent_id, before=None):
        """Run the model, then capture the [user, assistant...] messages just produced
        as a user node + an assistant-node child. The assistant node records the files that
        changed this turn (diff of the parent's reconstructed state vs disk after the run).
        Returns the new assistant node id."""
        if before is None:
            before = self.tree.file_state_at(parent_id)
        # the user message is already the last entry; capture from there after the run
        user_start = len(self.provider.messages) - 1
        self.provider.run()
        new = self.provider.messages[user_start:]
        delta = self._diffFiles(before, self._snapshotDisk())
        u = self.tree.add_node(parent_id, "user", new[:1])
        return self.tree.add_node(u, "assistant", new[1:], files=delta)

    def loadStory(self):
        # Load previous history for UI display (not sent to model)
        previous_messages = loadAllPreviousHistory(self.story_id)
        if previous_messages:
            frontend_previous = self._transformMessagesForFrontend(previous_messages)
            self.socket.emit('previous_history', frontend_previous)

        history = self.loadMessages()
        if history is not None:
            self.saveMessages()  # persist migration / live system prompt
            self._emitHistory()
        elif not previous_messages:
            self.socket.emit('story_empty')
        self.socket.emit('assistant_ready')
        self.socket.emit('turn_end', {"cost_stats": self.provider.getCostStats()})

    def startStory(self):
        """Kick off a brand-new story (triggered by the frontend's Start Story button)."""
        self._rebuildContext()  # seed [system]; the provider no longer holds a system message of its own
        self.provider.addUserMessage("System: start of story")
        self._runIntoTurn(None)
        self._rebuildContext()
        self.saveMessages()
        self._emitHistory()
        self.socket.emit('turn_end', {"cost_stats": self.provider.getCostStats()})
    
    def _transformMessagesForFrontend(self, messages: list[dict]) -> list[dict]:
        """Transform messages from OpenRouter format to frontend format"""
        frontend_messages = []
        
        # Special messages that should not be displayed to the user
        SKIP_MESSAGES = {"System: start of story"}
        
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")
            
            # Skip system messages
            if role == "system":
                continue
            
            # Skip special internal messages
            if content in SKIP_MESSAGES:
                continue
            
            # Handle user messages
            if role == "user":
                frontend_messages.append({
                    "type": "user",
                    "content": content,
                    "timestamp": msg.get("timestamp", "")
                })
            
            # Handle assistant messages
            elif role == "assistant":
                reasoning = msg.get("reasoning", "").strip()
                if reasoning != "":
                    frontend_messages.append({
                        "type": "thinking",
                        "content": reasoning,
                        "timestamp": msg.get("timestamp", "")
                    })
                
                # Check if there are tool calls
                if msg.get("tool_calls"):
                    for tool_call in msg.get("tool_calls", []):
                        frontend_messages.append({
                            "type": "tool_use",
                            "name": tool_call["function"]["name"],
                            "input": tool_call["function"]["arguments"],
                            "timestamp": msg.get("timestamp", "")
                        })
                
                # Add the text content if present
                if content and content.strip():
                    frontend_messages.append({
                        "type": "assistant",
                        "content": content,
                        "timestamp": msg.get("timestamp", "")
                    })
            
            # Handle tool result messages
            elif role == "tool":
                frontend_messages.append({
                    "type": "tool_result",
                    "content": content,
                    "timestamp": msg.get("timestamp", "")
                })
        
        return frontend_messages

    def _transformTreeForFrontend(self) -> list[dict]:
        """Active-path nodes, each with branch info and per-node frontend messages."""
        nodes = []
        for nid in self.tree.path():
            node = self.tree.nodes[nid]
            idx, count = self.tree.branch_info(nid)
            nodes.append({
                "id": nid,
                "role": node["role"],
                "idx": idx,
                "count": count,
                "messages": self._transformMessagesForFrontend(node["messages"]),
            })
        return nodes

    def _leafCost(self) -> float:
        node = self.tree.nodes.get(self.tree.current_leaf)
        if not node:
            return 0.0
        return sum(m.get("usage", {}).get("cost", 0.0) for m in node["messages"])

    def handleUserMessage(self, data: dict[str, str]) -> None:
        parent = self.tree.current_leaf
        self._rebuildContext()  # rebuild [system] + active branch before appending the new user turn
        self.provider.addUserMessage(data['message'])
        self._runIntoTurn(parent)
        self._rebuildContext()
        self.saveMessages()
        self._emitHistory()

    def regenerate_turn(self, node_id: str) -> None:
        node = self.tree.nodes.get(node_id)
        if not node or node["role"] != "assistant":
            return
        parent = node["parent"]  # the user node this responds to
        before = self._restoreFor(parent)  # rewind story files so the re-run reads the right branch
        self.provider.messages = [self._systemMessage()] + self.tree.messages_to(parent)
        self.provider.recompute_usage_from_messages(self.provider.messages)
        n = len(self.provider.messages)
        self.provider.run()
        delta = self._diffFiles(before, self._snapshotDisk())
        self.tree.add_node(parent, "assistant", self.provider.messages[n:], files=delta)
        self._rebuildContext()
        self.saveMessages()
        self._emitHistory()

    def edit_turn(self, node_id: str, new_content: str) -> None:
        node = self.tree.nodes.get(node_id)
        if not node or node["role"] != "user":
            return
        grandparent = node["parent"]  # the assistant node before it (or None)
        before = self._restoreFor(grandparent)  # rewind story files so the re-run reads the right branch
        self.provider.messages = [self._systemMessage()] + self.tree.messages_to(grandparent)
        self.provider.addUserMessage(new_content)
        self.provider.recompute_usage_from_messages(self.provider.messages)
        self._runIntoTurn(grandparent, before=before)
        self._rebuildContext()
        self.saveMessages()
        self._emitHistory()

    def _finishNav(self) -> None:
        """Shared tail for pure-navigation ops (branch-switch, rollback): materialize the active
        leaf's files, refresh cost, persist, and emit the updated history + turn end."""
        self._materialize(self.tree.current_leaf)
        self.provider.last_turn_cost = self._leafCost()
        self.saveMessages()
        self._emitHistory()
        self.socket.emit('turn_end', {"cost_stats": self.provider.getCostStats()})

    def switch_branch(self, node_id: str, direction: int) -> None:
        sibs = self.tree.siblings(node_id)
        if node_id not in sibs or len(sibs) < 2:
            return
        self.tree.set_leaf(sibs[(sibs.index(node_id) + direction) % len(sibs)])
        self._finishNav()

    def rollback_to(self, node_id: str) -> None:
        """Jump the active leaf back to an earlier turn and restore its file state to disk.
        Descendant branches are preserved; a later message branches from this node."""
        node = self.tree.nodes.get(node_id)
        if not node or node["role"] != "assistant":
            return
        self.tree.current_leaf = node_id
        self._finishNav()

    def __str__(self) -> str:
        return f"Narrator(model_name={self.model_name}, system={self.system_name}, tools=Toolbox[{len(self.tb.tools)}])"
