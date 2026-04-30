ALLOWED_TRANSITIONS = {
    'draft': {'available', 'cancelled_by_system'},
    'available': {'notified', 'accepted', 'expired', 'cancelled_by_system'},
    'notified': {'accepted', 'expired', 'cancelled_by_system'},
    'accepted': {'pickup_scheduled', 'cancelled_by_system'},
    'pickup_scheduled': {'completed', 'cancelled_by_system'},
    'completed': set(),
    'expired': set(),
    'cancelled_by_system': set(),
}


def is_transition_allowed(current_status, next_status):
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    return next_status in allowed


def validate_transition(current_status, next_status):
    if not is_transition_allowed(current_status, next_status):
        raise ValueError(f'Invalid status transition: {current_status} -> {next_status}')
