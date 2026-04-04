def success_response(data: object) -> dict:
    """
    Wrap any data in the standard API envelope.

    Shape: { "success": true, "data": ..., "error": null }
    """
    return {"success": True, "data": data, "error": None}


def error_response(message: str) -> dict:
    """
    Wrap an error message in the standard API envelope.

    Shape: { "success": false, "data": null, "error": "..." }
    """
    return {"success": False, "data": None, "error": message}
