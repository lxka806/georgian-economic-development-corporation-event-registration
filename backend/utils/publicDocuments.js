const withParticipantCount = (document) => {
    const { participants, ...publicDocument } = document;

    return {
        ...publicDocument,
        participantsCount: Array.isArray(participants) ? participants.length : 0
    };
};

module.exports = { withParticipantCount };
