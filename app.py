#!./.venv/bin/python
import os
import json
from flask_socketio import SocketIO, emit
from flask import Flask, render_template, redirect, url_for
from narrator import Narrator

from utils import (
    logger, listStoryNames, loadStoryInfo, makeNewStoryDir,
    historyExists, isValidGameSystem, listGameSystemNames,
    archiveHistory, copyStory, archiveStoryDir,
)

app = Flask(__name__, template_folder="frontend/templates", static_folder="frontend/static")
app.secret_key = os.urandom(24)
socket = SocketIO(app, cors_allowed_origins="*")

global narrator
narrator = None
models = [
    "anthropic/claude-opus-4.6",
    "anthropic/claude-3-5-haiku",
    "openai/gpt-5.2",
    "openai/gpt-4o-mini",
    "google/gemini-3-pro-preview",
    "moonshotai/kimi-k2.5",
]

def init_narrator(story_name: str, story_info: dict, model_name: str) -> Narrator:
    if historyExists(story_name):
        logger.debug(f"loading existing history for story: '{story_name}'")
        return Narrator.initFromHistory(story_name, socket)
    else:
        logger.debug(f"creating new history for story: '{story_name}'")
        return Narrator(
            model_name = model_name,
            system_name = story_info["system"],
            story_name = story_name,
            socket = socket,
        )

@socket.on('select_story')
def select_story(data: dict[str, str]):
    logger.debug(f"selected story: '{data['selected_story']}'")
    story_name = data['selected_story']
    model_name = data.get('model_name')
    system_name = data.get('system_name')
    story_info = loadStoryInfo(story_name, model_name=model_name, system_name=system_name)
    system_name = story_info.get("system")
    if not system_name or not isValidGameSystem(system_name):
        emit('error', {"message": f"Invalid or unavailable system for story '{story_name}': {system_name}"})
        return
    model_name = story_info.get("model", data.get('model_name'))

    global narrator
    narrator = init_narrator(story_name, story_info, model_name)
    logger.debug(f"narrator initialized for story: '{story_name}'")
    narrator.loadStory()
    emit('story_locked', {"model_name": narrator.model_name, "system_name": story_info["system"]})
    logger.info(f"narrator initialized: {narrator}")

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
        if not isValidGameSystem(system):
            emit('error', {"message": f"Invalid or unavailable system '{system}'"})
            return
        makeNewStoryDir(story_name, system, model_name)
        emit('story_created', {
            "story_name": story_name,
            "system": system,
            "model": model_name
        })

@socket.on('copy_story')
def copy_story(data: dict[str, str]):
    source_story_name = data.get('source_story')
    new_story_name = data.get('new_story_name', '').strip()
    model_name = data.get('model_name')
    copy_all_history = data.get('copy_all_history', False)
    
    if not source_story_name or not new_story_name:
        emit('error', {"message": "Source story name and new story name are required"})
        return
    
    if not model_name:
        emit('error', {"message": "Model name is required"})
        return
    
    # Check if new story name already exists
    if new_story_name in listStoryNames():
        emit('error', {"message": f"Story '{new_story_name}' already exists"})
        return
    
    # Copy the story
    if copyStory(source_story_name, new_story_name, model_name, copy_all_history):
        # Load story info to get system
        story_info = loadStoryInfo(new_story_name)
        emit('story_copied', {
            "story_name": new_story_name,
            "system": story_info.get('system', 'hp'),
            "model": model_name
        })
    else:
        emit('error', {"message": f"Failed to copy story '{source_story_name}'"})

@socket.on('archive_history')
def archive_history():
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    story_name = narrator.story_name
    if archiveHistory(story_name):
        logger.debug(f"archived history for story: '{story_name}'")
        # Clear the narrator's messages so the next user message starts fresh
        narrator.clearMessages()
        emit('history_archived', {"success": True})
    else:
        emit('error', {"message": "No history to archive"})

@socket.on('delete_story')
def delete_story(data: dict[str, str]):
    global narrator
    story_name = data.get('story_name', '').strip()
    if not story_name:
        emit('error', {"message": "Story name is required"})
        return
    if archiveStoryDir(story_name):
        # If the deleted story is currently loaded, clear the narrator
        if narrator is not None and narrator.story_name == story_name:
            narrator = None
        logger.debug(f"archived (deleted) story: '{story_name}'")
        emit('story_deleted', {"story_name": story_name})
    else:
        emit('error', {"message": f"Story '{story_name}' not found"})

@socket.on('retry_last_response')
def retry_last_response():
    global narrator
    assert narrator is not None, "Narrator has not been initialized."
    messages = narrator.provider.messages
    for i in range(len(messages) - 1, -1, -1):
        if messages[i].get("role") == "user":
            narrator.provider.messages = messages[:i + 1]
            narrator.provider.run()
            narrator.saveMessages()
            return

def get_stories_with_info():
    """Helper to load all stories with their info."""
    stories_with_info = []
    for story_name in listStoryNames():
        try:
            story_info = loadStoryInfo(story_name)
            stories_with_info.append({
                'name': story_name,
                'system': story_info.get('system', 'unknown'),
                'model': story_info.get('model', 'unknown')
            })
        except Exception as e:
            # If we can't load info, still show the story
            stories_with_info.append({
                'name': story_name,
                'system': 'unknown',
                'model': 'unknown'
            })
    return stories_with_info

@app.route('/')
def index():
    return render_template('index.html', 
                           stories=get_stories_with_info(), 
                           models=models, 
                           systems=listGameSystemNames(),
                           selected_story=None)

@app.route('/stories/<story_name>')
def story_page(story_name):
    # Check if story exists
    if story_name not in listStoryNames():
        # Story doesn't exist, redirect to home
        return redirect(url_for('index'))
    return render_template('index.html', 
                           stories=get_stories_with_info(), 
                           models=models, 
                           systems=listGameSystemNames(),
                           selected_story=story_name)

if __name__ == "__main__":
    socket.run(app, port=5001, debug=True, allow_unsafe_werkzeug=True)
