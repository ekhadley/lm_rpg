import os
import json
from utils import getFullStoryInstruction, loadAllPreviousHistory
from model_tools import Toolbox, SYSTEM_TOOLBOXES
from callbacks import WebCallbackHandler
from openrouter import OpenRouterProvider
from history import TurnTree
from flask_socketio import SocketIO
    
class Narrator:
    def __init__(self, model_name: str, story_name: str, system_name: str, socket: SocketIO):
        self.model_name: str = model_name
        self.system_name: str = system_name
        self.story_name: str = story_name
        self.tb: Toolbox = SYSTEM_TOOLBOXES[system_name](story_name, system_name)
        self.socket: SocketIO = socket
        self.system_prompt = getFullStoryInstruction(system_name, story_name)
        self.story_history_path = f"./stories/{story_name}/history.json"
        self.thinking_effort = "xhigh"
        self.tree = TurnTree.empty()

        self.provider = OpenRouterProvider(
            model_name=model_name,
            system_prompt=self.system_prompt,
            thinking_effort=self.thinking_effort,
            toolbox=self.tb,
            callback_handler=WebCallbackHandler(socket)
        )

    def _systemMessage(self) -> dict:
        return {"role": "system", "content": [{"type": "text", "text": self.system_prompt, "cache_control": {"type": "ephemeral"}}]}

    def _rebuildContext(self):
        """Set the provider's flat message list to [system] + the active branch."""
        self.provider.messages = [self._systemMessage()] + self.tree.active_messages()
        self.provider.recompute_usage_from_messages(self.provider.messages)

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

    def refreshSystemPrompt(self):
        """Re-read story files (including a freshly-written summary) into the system prompt."""
        self.system_prompt = getFullStoryInstruction(self.system_name, self.story_name)

    def clearMessages(self):
        """Reset to an empty tree. Used after summarization."""
        self.tree = TurnTree.empty()
        self._rebuildContext()

    def _emitHistory(self):
        self.socket.emit('conversation_history', self._transformTreeForFrontend())

    def _runIntoTurn(self, parent_id):
        """Run the model, then capture the [user, assistant...] messages just produced
        as a user node + an assistant-node child. Returns the new assistant node id."""
        n = len(self.provider.messages)
        # the user message is already the last entry; capture from there after the run
        user_start = n - 1
        self.provider.run()
        new = self.provider.messages[user_start:]
        u = self.tree.add_node(parent_id, "user", new[:1])
        return self.tree.add_node(u, "assistant", new[1:])

    def loadStory(self):
        # Load previous history for UI display (not sent to model)
        previous_messages = loadAllPreviousHistory(self.story_name)
        if previous_messages:
            frontend_previous = self._transformMessagesForFrontend(previous_messages)
            self.socket.emit('previous_history', frontend_previous)

        history = self.loadMessages()
        if history is not None:
            self.saveMessages()  # persist migration / live system prompt
            self._emitHistory()
        elif not previous_messages:
            self.provider.addUserMessage("System: start of story")
            self._runIntoTurn(None)
            self._rebuildContext()
            self.saveMessages()
            self._emitHistory()
        self.socket.emit('assistant_ready')
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
        self.provider.messages = [self._systemMessage()] + self.tree.messages_to(parent)
        self.provider.recompute_usage_from_messages(self.provider.messages)
        n = len(self.provider.messages)
        self.provider.run()
        self.tree.add_node(parent, "assistant", self.provider.messages[n:])
        self._rebuildContext()
        self.saveMessages()
        self._emitHistory()

    def edit_turn(self, node_id: str, new_content: str) -> None:
        node = self.tree.nodes.get(node_id)
        if not node or node["role"] != "user":
            return
        grandparent = node["parent"]  # the assistant node before it (or None)
        self.provider.messages = [self._systemMessage()] + self.tree.messages_to(grandparent)
        self.provider.addUserMessage(new_content)
        self.provider.recompute_usage_from_messages(self.provider.messages)
        self._runIntoTurn(grandparent)
        self._rebuildContext()
        self.saveMessages()
        self._emitHistory()

    def switch_branch(self, node_id: str, direction: int) -> None:
        sibs = self.tree.siblings(node_id)
        if node_id not in sibs or len(sibs) < 2:
            return
        target = sibs[(sibs.index(node_id) + direction) % len(sibs)]
        self.tree.set_leaf(target)
        self._rebuildContext()
        self.provider.last_turn_cost = self._leafCost()
        self.saveMessages()
        self._emitHistory()
        self.socket.emit('turn_end', {"cost_stats": self.provider.getCostStats()})

    def __str__(self) -> str:
        return f"Narrator(model_name={self.model_name}, system={self.system_name}, tools=Toolbox[{len(self.tb.tools)}])"
