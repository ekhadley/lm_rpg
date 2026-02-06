from flask_socketio import SocketIO
from utils import logger

class CallbackHandler:
    def text_output(self, text):
        pass
    def think_output(self, text):
        pass
    def think_end(self):
        pass
    def tool_request(self, name:str, inputs: dict):
        pass
    def tool_submit(self, names: list[str], inputs: list[dict], results: list[str]):
        pass
    def turn_end(self, cost_stats: dict = None, finish_reason: str = None):
        pass

class WebCallbackHandler(CallbackHandler):
    def __init__(self, socket: SocketIO):
        self.socket = socket
        self.outputting_text = False
        self.thinking = False

    def think_output(self, text):
        if not self.thinking:
            self.thinking = True
            self.socket.emit('think_start')
        self.emit('think_output', text=text)
    
    def think_end(self):
        self.thinking = False
        self.socket.emit('think_end')

    def text_output(self, text):
        if not self.outputting_text:
            self.outputting_text = True
            self.socket.emit('text_start')
        self.emit('text_output', text=text)

    def tool_request(self, name:str, inputs: dict):
        self.outputting_text = False
        self.emit('tool_request', name=name, inputs=inputs)

    def tool_submit(self, names: list[str], inputs: list[dict], results: list[str]):
        self.outputting_text = False
        self.emit('tool_submit', tools=[{"name": names[i], "inputs": inputs[i], "result": results[i]} for i in range(len(names))])

    def turn_end(self, cost_stats: dict = None, finish_reason: str = None):
        self.outputting_text = False
        self.thinking = False  # Reset for next turn so think_start is emitted properly
        if finish_reason:
            logger.debug(f"Turn ended with finish_reason: {finish_reason}")
        self.emit('turn_end', cost_stats=cost_stats)

    def emit(self, event, **kwargs):
        self.socket.emit(event, kwargs)
        self.socket.sleep(0)
