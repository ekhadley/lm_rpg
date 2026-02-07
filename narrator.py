import os
import json
import importlib.util

from utils import getFullStoryInstruction, loadAllPreviousHistory
from model_tools import Toolbox
from callbacks import WebCallbackHandler
from openrouter import OpenRouterProvider
from flask_socketio import SocketIO

SYSTEMS_DIR = "systems"

def makeNarratorToolbox(story_name: str, system_name: str) -> Toolbox:
    """
    Dynamically load the system's tools.py and call its make_toolbox().
    Crashes if tools.py doesn't exist or make_toolbox() fails.
    """
    tools_path = os.path.join(SYSTEMS_DIR, system_name, "tools.py")
    
    spec = importlib.util.spec_from_file_location(f"{system_name}_tools", tools_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    return module.make_toolbox(story_name, system_name)
    
class Narrator:
    def __init__(self, model_name: str, story_name: str, system_name: str, socket: SocketIO):
        self.model_name: str = model_name
        self.system_name: str = system_name
        self.story_name: str = story_name
        self.tb: Toolbox = makeNarratorToolbox(story_name, system_name)
        self.socket: SocketIO = socket
        self.system_prompt = getFullStoryInstruction(system_name, story_name)
        self.story_history_path = f"./stories/{story_name}/history.json"
        self.thinking_effort = "xhigh"

        self.provider = OpenRouterProvider(
            model_name=model_name,
            system_prompt=self.system_prompt,
            thinking_effort=self.thinking_effort,
            toolbox=self.tb,
            callback_handler=WebCallbackHandler(socket)
        )
    
    def saveMessages(self):
        self.provider.saveMessages(self.story_history_path, model_name=self.model_name, system_name=self.system_name)

    def loadMessages(self) -> list[dict[str, str]] | None:
        return self.provider.loadMessages(self.story_history_path)
    
    def clearMessages(self):
        """Clear all messages from the provider. Used after archiving history."""
        self.provider.messages = []

    @staticmethod
    def initFromHistory(story_name: str, socket: SocketIO) -> "Narrator":
        history_path = f"./stories/{story_name}/history.json"
        with open(history_path) as f:
            history_data: dict[str, str] = json.load(f)
            model_name = history_data["model_name"]
            system_name = history_data["system_name"]
            return Narrator(model_name, story_name, system_name, socket)
        

    def loadStory(self):
        # Load previous history for UI display (not sent to model)
        previous_messages = loadAllPreviousHistory(self.story_name)
        if previous_messages:
            frontend_previous = self._transformMessagesForFrontend(previous_messages)
            self.socket.emit('previous_history', frontend_previous)
        
        # Load live history (this populates self.provider.messages for model)
        history = self.loadMessages()
        if history is not None:
            self.saveMessages()  # Persist live system prompt update to disk
            # Transform messages from OpenRouter format (role) to frontend format (type)
            frontend_messages = self._transformMessagesForFrontend(self.provider.messages)
            self.socket.emit('conversation_history', frontend_messages)
        elif not previous_messages:
            self.provider.addUserMessage("System: start of story")
            self.provider.run()
            self.saveMessages()
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
     
    def handleUserMessage(self, data: dict[str, str]) -> None:
        self.provider.addUserMessage(data['message'])
        self.provider.run()
        # turn_end is emitted by the provider's callback with cost_stats
        self.saveMessages()

    def __str__(self) -> str:
        return f"Narrator(model_name={self.model_name}, system={self.system_name}, tools=Toolbox[{len(self.tb.tools)}])"
