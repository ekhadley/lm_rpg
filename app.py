import os
import json
from flask_socketio import SocketIO, emit
from flask import Flask, render_template
from narrator import Narrator

from utils import *

app = Flask(__name__, template_folder="frontend/templates", static_folder="frontend/static")
app.secret_key = os.urandom(24)
socket = SocketIO(app, cors_allowed_origins="*")

global narrator
narrator = None
models = [
    "openai/gpt-5.1",
    "openai/gpt-5",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-opus-4.1",
    "google/gemini-3-pro-preview",
    "moonshotai/kimi-k2-0905"
]

def init_narrator(story_name: str, story_info: dict, model_name: str) -> Narrator:
    if historyExists(story_name):
        if debug(): print(lime, f"loading existing history for story: '{story_name}'", endc)
        return Narrator.initFromHistory(story_name, socket)
    else:
        if debug(): print(green, f"creating new history for story: '{story_name}'", endc)
        return Narrator(
            model_name = model_name,
            system_name = story_info["system"],
            story_name = story_name,
            socket = socket,
        )

@socket.on('select_story')
def select_story(data: dict[str, str]):
    if debug():
        print(cyan, f"selected story: '{data['selected_story']}'", endc)
    print(json.dumps(data, indent=2))
    story_name = data['selected_story']
    story_info = loadStoryInfo(story_name)
    model_name = story_info.get("model", data.get('model_name'))
    print(json.dumps(story_info, indent=2))

    global narrator
    narrator = init_narrator(story_name, story_info, model_name)
    if debug(): print(cyan, f"narrator initialized for story: '{story_name}'", endc)
    narrator.loadStory()
    emit('story_locked', {"model_name": narrator.model_name, "system_name": story_info["system"]})
    print(f"narrator initialized: {narrator}")

@socket.on('user_message')
def handle_user_message(data: dict[str, str]):
    global narrator
    assert narrator is not None, f"Narrator has not been initialized."
    narrator.handleUserMessage(data)

@socket.on('create_story')
def create_story(data: dict[str, str]):
    story_name = data['story_name'].strip()
    system = data['system_name']
    model_name = data['model_name']
    if story_name:
        makeNewStoryDir(story_name, system, model_name)

@app.route('/')
def index():
    return render_template('index.html', stories=listStoryNames(), models=models, systems=listGameSystemNames())

if __name__ == "__main__":
    socket.run(app, port=5001)
