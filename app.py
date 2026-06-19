#!./.venv/bin/python
import os
import json
from flask_socketio import SocketIO, emit
from flask import Flask, render_template, redirect, url_for
from narrator import Narrator

from utils import (
    logger, listStoryIds, loadStoryInfo, makeNewStoryDir,
    historyExists, isValidGameSystem, listGameSystemNames,
    archiveHistory, copyStory, archiveStoryDir, renameStory, listStoryMarkdownFiles,
    loadAllPreviousHistory,
)

app = Flask(__name__, template_folder="frontend/templates", static_folder="frontend/static")
app.secret_key = os.urandom(24)
socket = SocketIO(app, cors_allowed_origins="*")

global narrator
narrator = None
settings = {"cache_mode": "1h"}  # "none" | "5m" | "1h"
models = [
    "anthropic/claude-fable-5",
    "anthropic/claude-opus-4.8",
    "anthropic/claude-haiku-4.5",
    "openai/gpt-5.5",
    "openai/gpt-4o-mini",
    "google/gemini-3.1-pro-preview",
    "moonshotai/kimi-k2.5",
]

def init_narrator(story_id: str, story_info: dict, model_name: str) -> Narrator:
    logger.debug(f"{'loading existing' if historyExists(story_id) else 'creating new'} history for story: '{story_id}'")
    return Narrator(
        model_name = model_name,
        system_name = story_info["system"],
        story_id = story_id,
        socket = socket,
        cache_mode = settings["cache_mode"],
    )

@socket.on('set_settings')
def set_settings(data: dict[str, str]):
    cache_mode = data.get('cache_mode')
    if cache_mode not in ("none", "5m", "1h"):
        emit('error', {"message": f"Invalid cache mode: {cache_mode}"})
        return
    settings["cache_mode"] = cache_mode
    if narrator is not None:
        narrator.setCacheMode(cache_mode)
    logger.debug(f"cache mode set to '{cache_mode}'")

@socket.on('select_story')
def select_story(data: dict[str, str]):
    logger.debug(f"selected story: '{data['selected_story']}'")
    story_id = data['selected_story']
    model_name = data.get('model_name')
    system_name = data.get('system_name')
    story_info = loadStoryInfo(story_id, model_name=model_name, system_name=system_name)
    system_name = story_info.get("system")
    if not system_name or not isValidGameSystem(system_name):
        emit('error', {"message": f"Invalid or unavailable system for story '{story_id}': {system_name}"})
        return
    model_name = story_info.get("model", data.get('model_name'))

    global narrator
    narrator = init_narrator(story_id, story_info, model_name)
    logger.debug(f"narrator initialized for story: '{story_id}'")
    narrator.loadStory()
    emit('story_locked', {
        "model_name": narrator.model_name,
        "system_name": story_info["system"],
        "story_files": listStoryMarkdownFiles(story_id),
    })
    logger.info(f"narrator initialized: {narrator}")

@socket.on('start_story')
def start_story():
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    narrator.startStory()

@socket.on('user_message')
def handle_user_message(data: dict[str, str]):
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    narrator.handleUserMessage(data)

@socket.on('create_story')
def create_story(data: dict[str, str]):
    display_name = data['story_name'].strip()
    system = data['system_name']
    model_name = data['model_name']
    if display_name:
        if not isValidGameSystem(system):
            emit('error', {"message": f"Invalid or unavailable system '{system}'"})
            return
        story_id = makeNewStoryDir(display_name, system, model_name)
        emit('story_created', {
            "id": story_id,
            "name": display_name,
            "system": system,
            "model": model_name
        })

@socket.on('copy_story')
def copy_story(data: dict[str, str]):
    source_story_id = data.get('source_story')
    new_name = data.get('new_story_name', '').strip()
    model_name = data.get('model_name')
    copy_pc = data.get('copy_pc', True)
    copy_plan = data.get('copy_plan', True)
    copy_summary = data.get('copy_summary', True)
    copy_history = data.get('copy_history', False)
    copy_other = data.get('copy_other', True)

    if not source_story_id or not new_name:
        emit('error', {"message": "Source story and new story name are required"})
        return

    if not model_name:
        emit('error', {"message": "Model name is required"})
        return

    new_story_id = copyStory(source_story_id, new_name, model_name, copy_pc, copy_plan, copy_summary, copy_history, copy_other)
    if new_story_id:
        story_info = loadStoryInfo(new_story_id)
        emit('story_copied', {
            "id": new_story_id,
            "name": new_name,
            "system": story_info.get('system', 'hp'),
            "model": model_name
        })
    else:
        emit('error', {"message": f"Failed to copy story '{source_story_id}'"})

@socket.on('summarize_history')
def summarize_history():
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    story_id = narrator.story_id
    logger.debug(f"summarizing story: '{story_id}' -- sending compaction message to model")
    # Let the model write the summary / save any state it needs from the full conversation
    narrator.handleUserMessage({"message": "System: archive story state"})
    if archiveHistory(story_id):
        logger.debug(f"archived full history to previous/ for story: '{story_id}', starting fresh conversation")
        # clearMessages rebuilds context, which live-reads the freshly-written summary into the system prompt
        narrator.clearMessages()
        emit('history_summarized', {"success": True})
    else:
        emit('error', {"message": "No history to summarize"})

@socket.on('delete_story')
def delete_story(data: dict[str, str]):
    global narrator
    story_id = data.get('story_id', '').strip()
    if not story_id:
        emit('error', {"message": "Story id is required"})
        return
    if archiveStoryDir(story_id):
        # If the deleted story is currently loaded, clear the narrator
        if narrator is not None and narrator.story_id == story_id:
            narrator = None
        logger.debug(f"archived (deleted) story: '{story_id}'")
        emit('story_deleted', {"story_id": story_id})
    else:
        emit('error', {"message": f"Story '{story_id}' not found"})

@socket.on('rename_story')
def rename_story(data: dict[str, str]):
    story_id = data.get('story_id', '').strip()
    new_name = data.get('new_name', '').strip()
    if not story_id or not new_name:
        emit('error', {"message": "Story id and new name are required"})
        return
    if renameStory(story_id, new_name):
        logger.debug(f"renamed story '{story_id}' -> '{new_name}'")
        emit('story_renamed', {"story_id": story_id, "new_name": new_name})
    else:
        emit('error', {"message": f"Failed to rename story '{story_id}'"})

@socket.on('get_system_instructions')
def get_system_instructions():
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    filepath = f"./instructions/{narrator.system_name}.md"
    if not os.path.exists(filepath):
        emit('error', {"message": "System instructions not found"})
        return
    with open(filepath, 'r') as f:
        content = f.read()
    emit('story_file_content', {"filename": f"{narrator.system_name}.md", "content": content})

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
    filepath = f"./stories/{narrator.story_id}/{filename}"
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
    previous = loadAllPreviousHistory(narrator.story_id)
    if previous:
        result.extend([truncate_system(m) for m in previous])
        result.append({"role": "_separator", "content": "Current Conversation"})
    # Current/live conversation
    result.extend([truncate_system(m) for m in narrator.provider.messages])
    emit('debug_messages', result)

@socket.on('retry_response')
def retry_response(data=None):
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    turn_id = data.get('turn_id') if data else None
    if turn_id:
        narrator.regenerate_turn(turn_id)

@socket.on('edit_message')
def edit_message(data):
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    turn_id = data.get('turn_id')
    new_content = data.get('new_content', '')
    if not turn_id or not new_content:
        emit('error', {"message": "turn_id and new_content are required"})
        return
    narrator.edit_turn(turn_id, new_content)

@socket.on('switch_branch')
def switch_branch(data):
    global narrator
    if narrator is None:
        emit('error', {"message": "No story selected"})
        return
    turn_id = data.get('turn_id')
    direction = data.get('dir', 1)
    if turn_id:
        narrator.switch_branch(turn_id, direction)

def get_stories_with_info():
    """Helper to load all stories with their info. 'id' is the uuid directory, 'name' is the display name."""
    stories_with_info = []
    for story_id in listStoryIds():
        try:
            story_info = loadStoryInfo(story_id)
            stories_with_info.append({
                'id': story_id,
                'name': story_info.get('story_name', story_id),
                'system': story_info.get('system', 'unknown'),
                'model': story_info.get('model', 'unknown')
            })
        except Exception as e:
            # If we can't load info, still show the story
            stories_with_info.append({
                'id': story_id,
                'name': story_id,
                'system': 'unknown',
                'model': 'unknown'
            })
    return sorted(stories_with_info, key=lambda s: s['name'])

@app.route('/')
def index():
    return render_template('index.html', 
                           stories=get_stories_with_info(), 
                           models=models, 
                           systems=listGameSystemNames(),
                           selected_story=None)

@app.route('/stories/<story_id>')
def story_page(story_id):
    # Check if story exists
    if story_id not in listStoryIds():
        # Story doesn't exist, redirect to home
        return redirect(url_for('index'))
    return render_template('index.html',
                           stories=get_stories_with_info(),
                           models=models,
                           systems=listGameSystemNames(),
                           selected_story=story_id)

if __name__ == "__main__":
    socket.run(app, port=5001, debug=True, allow_unsafe_werkzeug=True)
