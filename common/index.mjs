export function validateId(id, type) {
    if (typeof id !== 'string' || id.length === 0 || id.length > 1024) {
        throw new Error(`Invalid ${type}. It must be a non-empty string with a maximum length of 1024 characters.`);
    }
    return id
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function validateText(text, type) {
    if (typeof text !== 'string' || text.length === 0 || text.length > 10000) {
        throw new Error(`Invalid ${type}. It must be a non-empty string with a maximum length of 10000 characters.`);
    }
    return text;
}

export function validateJson(json) {
    try {
        return JSON.parse(json);
    } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
}