import os
import random
import json
import inspect
from collections.abc import Callable

from utils import *

def parse_handler_metadata(func: Callable) -> dict:
    doc = inspect.getdoc(func)
    if not doc:
        raise ValueError("Tool handlers must have a docstring.")
    lines = doc.strip().splitlines()
    first_line = lines[0]
    if ':' not in first_line:
        raise ValueError("First line of docstring must be in the format 'tool_name: description'")
    
    tool_name, description = map(str.strip, first_line.split(':', 1))

    arg_properties = {}
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        try:
            name_type, param_desc = line.split(":", 1)
            name, type_str = name_type.strip().split("(", 1)
            name = name.strip()
            type_str = type_str.strip(") ").lower()
        except ValueError:
            raise ValueError(f"Invalid argument docstring line: '{line}'")
        arg_properties[name] = {
            "type": type_str,
            "description": param_desc.strip()
        }
    return {"name": tool_name, "description": description, "arg_properties": arg_properties, "handler": func}


class Tool:
    def __init__(self, handler: Callable, default_kwargs: None|dict = None):
        handler_props = parse_handler_metadata(handler)
        self.name = handler_props['name']
        self.description = handler_props['description']
        self.handler = handler
        self.arg_properties = handler_props['arg_properties']
        self.schema = {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.arg_properties,
                    "required": [key for key in self.arg_properties.keys()],
                },
            }
        }
        self.kwargs = default_kwargs if default_kwargs is not None else {}

    def getResult(self, parameters: dict) -> str:
        try:
            tool_result = str(self.handler(**parameters, **self.kwargs))
            return tool_result
        except Exception as e:
            logger.error(f"error in tool {self.name}: {str(e)}")
            return f"error in tool {self.name}: {str(e)}"
    
    
class Toolbox:
    def __init__(self, handlers: list[Callable], default_kwargs: dict = {}):
        self.tools = [Tool(handler, default_kwargs) for handler in handlers]
        self.kwargs = default_kwargs
        self.tool_map = {tool.name: tool for tool in self.tools}
    
    def getToolResult(self, tool_name: str, parameters: dict) -> str:
        logger.info(f"Tool: {tool_name}({parameters})")
        if isinstance(parameters, str):
            if parameters != "":
                try:
                    parameters = json.loads(parameters)
                except json.JSONDecodeError:
                    try:
                        parameters, _ = json.JSONDecoder().raw_decode(parameters)
                    except json.JSONDecodeError:
                        # If we can't parse it, it might be that the model sent a string that isn't JSON.
                        # We'll leave it as is and let the tool handler deal with it or fail.
                        # But actually the current code assumes parameters becomes a dict.
                        # If parsing fails completely, we should probably raise or return an error string.
                        raise
            else:
                parameters = {}
        if tool_name in self.tool_map:
            return self.tool_map[tool_name].getResult(parameters)
        else:
            logger.error(f"attempt to call nonexistent tool: {tool_name}")
            return f"error: Tool {tool_name} not found."

    def getToolSchemas(self) -> list[dict[str, str]]:
        return [tool.schema for tool in self.tools]

############## story tools ################

def list_story_files_tool_handler(**kwargs) -> list[str]:
    """list_files: Lists all files in the current story directory.
    """
    files = [f for f in os.listdir(f"./stories/{kwargs['story_name']}") if ".md" in f]
    files = [f.replace("'", "") for f in files]
    return files

def read_story_file_tool_handler(file_name: str, **kwargs) -> str:
    """read_file: Read the contents of a file in the current story directory.
    file_name (string): Name of the file to be read. Should include the file extension, and not include any parent folders or subfolders.
    """
    with open(f"./stories/{kwargs['story_name']}/{file_name}", 'r') as file:
        content = file.read()
    return content

def write_story_file_tool_handler(file_name: str, contents: str, **kwargs) -> str:
    """write_file: Create or overwrite a file in the current story directory with the given name and contents. The contents of the file, if it exists, will be deleted permanently. If editing a file, you should read the file first, then write the edited or extended version after.
    file_name (string): Name of the file to save to. Should be a markdown file, ending in '.md'. Should not be a part of any subfolder.
    contents (string): The contents to write to the file. Do not include backticks around the contents to be saved.
    """
    if not file_name.endswith(".md"):
        file_name += ".md"
    exists = os.path.exists(f"./stories/{kwargs['story_name']}/{file_name}")
    with open(f"./stories/{kwargs['story_name']}/{file_name}", 'w') as file:
        file.write(contents)
    if exists: return "File edited successfully."
    else: return "File saved successfully."

def append_story_file_tool_handler(file_name: str, contents: str, **kwargs) -> str:
    """append_file: Append contents to the end of an existing file in the current story directory. If the file doesn't exist, it will be created.
    file_name (string): Name of the file to append to. Should be a markdown file, ending in '.md'. Should not be a part of any subfolder.
    contents (string): The contents to append to the file. Do not include backticks around the contents to be appended.
    """
    if not file_name.endswith(".md"):
        file_name += ".md"
    exists = os.path.exists(f"./stories/{kwargs['story_name']}/{file_name}")
    with open(f"./stories/{kwargs['story_name']}/{file_name}", 'a') as file:
        file.write("\n" + contents)
    if exists: return "Contents appended to file successfully."
    else: return "File created and contents added successfully."

def roll_dice_tool_handler(dice: str, **kwargs) -> int:
    """roll_dice: Roll a set of dice with the given number of sides and return the sum of the rolls.
    dice (string): A string describing the set of dice to roll, of the form 'dX' or 'XdY'.
    """
    dice = dice.lower()
    num, sides = dice.strip().split('d')
    if num == '':
        num = 1
    else:
        try:
            num = int(num)
        except ValueError:
            raise ValueError("Invalid number of dice.")
    try:
        sides = int(sides)
    except ValueError:
        raise ValueError("Invalid number of sides.")
    
    if num < 1:
        raise ValueError("Number of dice must be greater than 0.")
    if sides < 1:
        raise ValueError("Number of sides must be greater than 0.")
    
    rolls = [random.randint(1, sides) for _ in range(num)]
    return sum(rolls)
