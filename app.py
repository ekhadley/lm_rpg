#!./.venv/bin/python
import os
import json
from flask_socketio import SocketIO, emit
from flask import Flask, render_template, redirect, url_for
from narrator import Narrator

from utils import (
    logger, listStoryNames, loadStoryInfo, makeNewStoryDir,
    historyExists, isValidGameSystem, listGameSystemNames,
    archiveHistory, copyStory, archiveStoryDir, listStoryMarkdownFiles,
    loadAllPreviousHistory,
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
    emit('story_locked', {
        "model_name": narrator.model_name,
        "system_name": story_info["system"],
        "story_files": listStoryMarkdownFiles(story_name),
    })
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
    # Let the model save any state it needs before archiving
    narrator.handleUserMessage({"message": "System: archive story state"})
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

@socket.on('get_story_file')
def get_story_file(data: dict[str, str]):
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    filename = data.get('filename', '')
    if not filename.endswith('.md') or '/' in filename or '\\' in filename:
        emit('error', {"message": "Invalid filename"})
        return
    filepath = f"./stories/{narrator.story_name}/{filename}"
    if not os.path.exists(filepath):
        emit('error', {"message": f"File not found: {filename}"})
        return
    with open(filepath, 'r') as f:
        content = f.read()
    emit('story_file_content', {"filename": filename, "content": content})

@socket.on('get_debug_messages')
def get_debug_messages():
    global narrator
    if narrator is None:
        emit('debug_messages', [])
        return

    def truncate_system(msg):
        m = dict(msg)
        if m.get('role') == 'system' and isinstance(m.get('content'), str) and len(m['content']) > 200:
            m['content'] = m['content'][:200] + f'... ({len(msg["content"])} chars total)'
        return m

    result = []
    # Previous (archived) conversations
    previous = loadAllPreviousHistory(narrator.story_name)
    if previous:
        result.extend([truncate_system(m) for m in previous])
        result.append({"role": "_separator", "content": "Current Conversation"})
    # Current/live conversation
    result.extend([truncate_system(m) for m in narrator.provider.messages])
    emit('debug_messages', result)

@socket.on('retry_response')
def retry_response(data=None):
    global narrator
    assert narrator is not None, "Narrator has not been initialized."
    messages = narrator.provider.messages
    turn_index = data.get('turn_index') if data else None

    if turn_index is not None:
        user_count = 0
        for i, msg in enumerate(messages):
            if msg.get("role") == "user":
                if user_count == turn_index:
                    narrator.provider.messages = messages[:i + 1]
                    narrator.provider.run()
                    narrator.saveMessages()
                    return
                user_count += 1
    else:
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
