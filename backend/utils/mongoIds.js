const isObjectIdString = (value) =>
    typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const getReferenceId = (reference) => {
    if (typeof reference === "string") {
        return reference.toLowerCase();
    }

    if (!reference || typeof reference !== "object") {
        return null;
    }

    if (typeof reference.toHexString === "function") {
        return reference.toHexString().toLowerCase();
    }

    if (typeof reference.$oid === "string") {
        return reference.$oid.toLowerCase();
    }

    if (reference._id && reference._id !== reference) {
        return getReferenceId(reference._id);
    }

    return null;
};

module.exports = { getReferenceId, isObjectIdString };
