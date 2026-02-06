import os
import json
import shutil
import logging

purple = '\x1b[38;2;255;0;255m'
blue = '\x1b[38;2;0;0;255m'
brown = '\x1b[38;2;128;128;0m'
cyan = '\x1b[38;2;0;255;255m'
lime = '\x1b[38;2;0;255;0m'
yellow = '\x1b[38;2;255;255;0m'
red = '\x1b[38;2;255;0;0m'
pink = '\x1b[38;2;255;51;204m'
orange = '\x1b[38;2;255;51;0m'
green = '\x1b[38;2;0;0;128m'
gray = '\x1b[38;2;127;127;127m'
magenta = '\x1b[38;2;128;0;128m'
white = '\x1b[38;2;255;255;255m'
bold = '\033[1m'
underline = '\033[4m'
endc = '\033[0m'

# === Logging Setup ===

class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to log messages based on level."""
    LEVEL_COLORS = {
        logging.DEBUG: gray,
        logging.INFO: cyan,
        logging.WARNING: orange,
        logging.ERROR: red,
    }
    
    def format(self, record):
        color = self.LEVEL_COLORS.get(record.levelno, white)
        message = super().format(record)
        return f"{color}{message}{endc}"

def _debug_enabled() -> bool:
    """Check if debug mode is enabled (used at module load time)."""
    return os.environ.get("DEBUG", "0").lower() == "1"

def setup_logger() -> logging.Logger:
    """Configure and return the application logger."""
    logger = logging.getLogger("lm_rpg")
    if not logger.handlers:  # Avoid adding handlers multiple times
        handler = logging.StreamHandler()
        handler.setFormatter(ColoredFormatter("%(levelname)s: %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if _debug_enabled() else logging.WARNING)
    return logger

logger = setup_logger()

# === Constants ===

STORIES_ROOT_DIR = "stories"
GAME_SYSTEMS_ROOT_DIR = "systems"

def debug() -> bool:
    return os.environ.get("DEBUG", "0").lower() == "1"

def truncateForDebug(obj: object, max_length: int=200):
    obj_str = str(obj)
    if len(obj_str) <= max_length:
        return repr(obj_str)
    return repr(obj_str[:max_length] + "...")

def listStoryNames() -> list[str]:
    return sorted(os.listdir("./stories"))

def _system_has_instructions(system_name: str) -> bool:
    """Returns True only if the system has a base instructions.md file."""
    return os.path.exists(f"{GAME_SYSTEMS_ROOT_DIR}/{system_name}/instructions.md")

def isValidGameSystem(system_name: str) -> bool:
    """Public validator to ensure the requested system has the required assets."""
    return _system_has_instructions(system_name)

def listGameSystemNames() -> list[str]:
    """Only return systems that are actually usable (have instructions)."""
    return sorted([name for name in os.listdir(f"{GAME_SYSTEMS_ROOT_DIR}") if _system_has_instructions(name)])

def makeNewStoryDir(story_name: str, system: str, model_name: str):
    story_dir = f"./stories/{story_name}"
    os.mkdir(story_dir)
    with open(os.path.join(story_dir, "info.json"), "w") as f:
        json.dump({
            "system": system,
            "model": model_name,
            "story_name": story_name,
        }, f, indent=4)

def loadStoryInfo(story_name: str, model_name: str = None, system_name: str = None) -> dict[str, str]:
    info_path = os.path.join(f"./stories/{story_name}", "info.json")
    if not os.path.exists(info_path):
        # Create info.json if it doesn't exist, using provided model and system
        if model_name and system_name:
            story_dir = f"./stories/{story_name}"
            os.makedirs(story_dir, exist_ok=True)
            with open(info_path, "w") as f:
                json.dump({
                    "system": system_name,
                    "model": model_name,
                    "story_name": story_name,
                }, f, indent=4)
        else:
            raise FileNotFoundError(f"info.json not found for story '{story_name}' and no model/system provided to create it")
    with open(info_path, "r") as f:
        return json.load(f)

def historyExists(story_name: str) -> bool:
    return os.path.exists(f"./stories/{story_name}/history.json")

def getFullStoryInstruction(system_name: str, story_name: str) -> str:
    """Fetches the system instructions and appends any existing story files (pc.md, story_plan.md, story_summary.md).
    
    Each section is wrapped in XML tags for clarity:
    - <global_instructions>: The game system's base instructions
    - <story_plan>: The story plan/outline
    - <player_character>: The player character details
    - <story_summary>: Summary of story events so far
    """
    result_parts = []
    
    # Load global instructions (required)
    with open(f"{GAME_SYSTEMS_ROOT_DIR}/{system_name}/instructions.md", 'r') as f:
        global_instructions = f.read()
    result_parts.append(f"<global_instructions>\n{global_instructions}\n</global_instructions>")
    
    # Load story plan (optional)
    story_plan_path = f"{STORIES_ROOT_DIR}/{story_name}/story_plan.md"
    if os.path.exists(story_plan_path):
        with open(story_plan_path, 'r') as f:
            story_plan = f.read()
        result_parts.append(f"<story_plan>\n{story_plan}\n</story_plan>")
    
    # Load player character (optional)
    pc_path = f"{STORIES_ROOT_DIR}/{story_name}/pc.md"
    if os.path.exists(pc_path):
        with open(pc_path, 'r') as f:
            player_character = f.read()
        result_parts.append(f"<player_character>\n{player_character}\n</player_character>")
    
    # Load story summary (optional)
    story_summary_path = f"{STORIES_ROOT_DIR}/{story_name}/story_summary.md"
    if os.path.exists(story_summary_path):
        with open(story_summary_path, 'r') as f:
            story_summary = f.read()
        result_parts.append(f"<story_summary>\n{story_summary}\n</story_summary>")
    
    return "\n\n".join(result_parts)

# === History Archive Functions ===

def getPreviousHistoryDir(story_name: str) -> str:
    """Get the path to the previous history directory for a story."""
    return f"./{STORIES_ROOT_DIR}/{story_name}/previous"

def getNextArchiveNumber(story_name: str) -> int:
    """Get the next available archive number (0, 1, 2...).
    
    Archives are numbered sequentially starting from 0.
    0 = oldest archived, higher numbers = more recently archived.
    """
    prev_dir = getPreviousHistoryDir(story_name)
    if not os.path.exists(prev_dir):
        return 0
    existing = [f for f in os.listdir(prev_dir) if f.endswith('.json')]
    return len(existing)

def archiveHistory(story_name: str) -> bool:
    """Move history.json to previous/{n}.json and delete history.json.
    
    Returns True if archive was successful, False if no history to archive.
    """
    history_path = f"./{STORIES_ROOT_DIR}/{story_name}/history.json"
    if not os.path.exists(history_path):
        return False
    prev_dir = getPreviousHistoryDir(story_name)
    os.makedirs(prev_dir, exist_ok=True)
    archive_num = getNextArchiveNumber(story_name)
    shutil.move(history_path, f"{prev_dir}/{archive_num}.json")
    return True

def loadAllPreviousHistory(story_name: str) -> list[dict]:
    """Load all previous history files in order (oldest first).
    
    Returns a flat list of all messages from all previous history files,
    combined in chronological order (0.json first, then 1.json, etc.).
    """
    prev_dir = getPreviousHistoryDir(story_name)
    if not os.path.exists(prev_dir):
        return []
    
    # Get all json files and sort by number
    files = [f for f in os.listdir(prev_dir) if f.endswith('.json')]
    files.sort(key=lambda f: int(f.replace('.json', '')))
    
    all_messages = []
    for filename in files:
        filepath = os.path.join(prev_dir, filename)
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                messages = data.get('messages', [])
                all_messages.extend(messages)
        except (json.JSONDecodeError, IOError):
            continue
    
    return all_messages

def copyStory(source_story_name: str, new_story_name: str, new_model_name: str, copy_all_history: bool = False) -> bool:
    """Copy a story to a new story directory.
    
    Args:
        source_story_name: Name of the source story to copy
        new_story_name: Name for the new story
        new_model_name: Model name for the new story
        copy_all_history: If True, copy all history files including archived conversations.
                         If False, only copy markdown files (pc.md, story_plan.md, story_summary.md)
    
    Returns:
        True if copy was successful, False otherwise
    """
    source_dir = f"./{STORIES_ROOT_DIR}/{source_story_name}"
    new_dir = f"./{STORIES_ROOT_DIR}/{new_story_name}"
    
    # Check if source exists
    if not os.path.exists(source_dir):
        return False
    
    # Check if destination already exists
    if os.path.exists(new_dir):
        return False
    
    try:
        # Create new directory
        os.makedirs(new_dir, exist_ok=True)
        
        # Load source story info
        source_info = loadStoryInfo(source_story_name)
        source_system = source_info.get('system', 'hp')
        
        # Create new info.json with new model
        with open(os.path.join(new_dir, "info.json"), "w") as f:
            json.dump({
                "system": source_system,
                "model": new_model_name,
                "story_name": new_story_name,
            }, f, indent=4)
        
        # Copy markdown files (always copied)
        markdown_files = ["pc.md", "story_plan.md", "story_summary.md"]
        for md_file in markdown_files:
            source_path = os.path.join(source_dir, md_file)
            if os.path.exists(source_path):
                shutil.copy2(source_path, os.path.join(new_dir, md_file))
        
        # Copy history files if requested
        if copy_all_history:
            # Copy current history.json if it exists
            source_history = os.path.join(source_dir, "history.json")
            if os.path.exists(source_history):
                shutil.copy2(source_history, os.path.join(new_dir, "history.json"))
            
            # Copy previous history directory if it exists
            source_prev_dir = getPreviousHistoryDir(source_story_name)
            if os.path.exists(source_prev_dir):
                new_prev_dir = getPreviousHistoryDir(new_story_name)
                shutil.copytree(source_prev_dir, new_prev_dir)
        
        return True
    except Exception as e:
        logger.error(f"Error copying story: {e}")
        # Clean up on error
        if os.path.exists(new_dir):
            shutil.rmtree(new_dir)
        return False