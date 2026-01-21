import os
import json

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

def loadStoryInfo(story_name: str) -> dict[str, str]:
    with open(os.path.join(f"./stories/{story_name}", "info.json"), "r") as f:
        return json.load(f)

def historyExists(story_name: str) -> bool:
    return os.path.exists(f"./stories/{story_name}/history.json")

def getFullStoryInstruction(system_name: str, story_name: str) -> str:
    """Fetches the system instructions and appends any existing story files (pc.md, story_plan.md, story_summary.md)."""
    with open(f"{GAME_SYSTEMS_ROOT_DIR}/{system_name}/instructions.md", 'r') as f:
        result = f.read()
    
    for file_name in ["pc.md", "story_plan.md", "story_summary.md"]:
        try:
            with open(f"{STORIES_ROOT_DIR}/{story_name}/{file_name}", 'r') as f:
                result += f"\n---\n{f.read()}"
        except FileNotFoundError:
            continue
    return result