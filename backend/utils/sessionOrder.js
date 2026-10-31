const compareByTimeThenId = (left, right) => {
    const leftTime = new Date(left.startTime).getTime();
    const rightTime = new Date(right.startTime).getTime();
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
    }

    return String(left._id).localeCompare(String(right._id));
};

const orderSessions = (sessions) => {
    const orderedSessions = sessions.map((session) => ({ ...session }));
    const assignedOrders = new Set();
    const unassignedSessions = [];

    const sessionsWithOrder = orderedSessions
        .filter((session) => Number.isSafeInteger(session.order) && session.order > 0)
        .sort((left, right) => left.order - right.order || compareByTimeThenId(left, right));

    for (const session of sessionsWithOrder) {
        if (assignedOrders.has(session.order)) {
            unassignedSessions.push(session);
            continue;
        }

        assignedOrders.add(session.order);
    }

    unassignedSessions.push(...orderedSessions.filter((session) =>
        !Number.isSafeInteger(session.order) || session.order < 1
    ));
    unassignedSessions.sort(compareByTimeThenId);
    let nextOrder = 1;
    for (const session of unassignedSessions) {
        while (assignedOrders.has(nextOrder)) {
            nextOrder += 1;
        }
        session.order = nextOrder;
        assignedOrders.add(nextOrder);
    }

    return orderedSessions
        .sort((left, right) => left.order - right.order || compareByTimeThenId(left, right))
        .map((session, index) => ({ ...session, order: index + 1 }));
};

module.exports = { orderSessions };
