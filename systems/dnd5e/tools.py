"""
D&D 5th Edition RPG system tools.
Defines the complete toolbox for D&D 5e stories.
"""
from model_tools import (
    Toolbox,
    list_story_files_tool_handler,
    read_story_file_tool_handler,
    write_story_file_tool_handler,
    append_story_file_tool_handler,
    roll_dice_tool_handler,
)

# Future D&D 5e-specific tools can be defined here:
# - initiative_tracker_tool_handler
# - condition_manager_tool_handler
# - etc.

def make_toolbox(story_name: str, system_name: str) -> Toolbox:
    """Create and return the complete toolbox for D&D 5e system."""
    handlers = [
        list_story_files_tool_handler,
        read_story_file_tool_handler,
        write_story_file_tool_handler,
        append_story_file_tool_handler,
        roll_dice_tool_handler,
    ]
    return Toolbox(
        handlers,
        default_kwargs={
            "story_name": story_name,
            "system_name": system_name,
        }
    )
