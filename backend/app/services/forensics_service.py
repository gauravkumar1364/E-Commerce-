from datetime import datetime
from hashlib import sha256

from flask import request

from app.extensions import db
from app.models.auth import AuditLog, LoginHistory, SecurityEvent
from app.models.forensics import EvidenceCollection, FraudDetection, TransactionLog
from app.security import pack_ip_address, sanitize_text_fields


SENSITIVE_FIELDS = {
    'password',
    'new_password',
    'confirm_password',
    'token',
    'refresh_token',
    'access_token',
    'payment_token',
    'csrf_token',
    'secret',
}


def redact_sensitive_payload(payload):
    if not isinstance(payload, dict):
        return None

    sanitized = {}
    for key, value in payload.items():
        if key.lower() in SENSITIVE_FIELDS:
            sanitized[key] = '[REDACTED]'
        elif isinstance(value, dict):
            sanitized[key] = redact_sensitive_payload(value)
        elif isinstance(value, list):
            sanitized[key] = [redact_sensitive_payload(item) if isinstance(item, dict) else item for item in value]
        else:
            sanitized[key] = value

    text_fields = [key for key, value in sanitized.items() if isinstance(value, str)]
    return sanitize_text_fields(sanitized, text_fields)


def build_payload_hash(payload):
    serialized = repr(payload).encode('utf-8')
    return sha256(serialized).hexdigest()


def log_audit_action(user_id, session_id, entity_name, entity_id, action_type, old_values=None, new_values=None):
    entry = AuditLog(
        actor_user_id=user_id,
        entity_name=entity_name,
        entity_id=entity_id,
        action_type=action_type,
        old_values=old_values,
        new_values=new_values,
        ip_address=pack_ip_address(request.headers.get('X-Forwarded-For', request.remote_addr)),
        user_agent=request.headers.get('User-Agent'),
    )
    db.session.add(entry)
    return entry


def log_transaction(user_id, order_id, payment_id, transaction_type, transaction_status, amount, currency_code, gateway_reference, risk_score=0, metadata=None):
    entry = TransactionLog(
        order_id=order_id,
        payment_id=payment_id,
        user_id=user_id,
        transaction_type=transaction_type,
        transaction_status=transaction_status,
        amount=amount,
        currency_code=currency_code,
        gateway_reference=gateway_reference,
        risk_score=risk_score,
        metadata=metadata,
    )
    db.session.add(entry)
    return entry


def detect_fraud(user_id, order_id=None, payment_id=None, amount=None, currency_code=None, payment_method=None, payment_status=None, payload=None):
    reasons = []
    risk_score = 0

    if amount is not None:
        try:
            if float(amount) >= 1000:
                risk_score += 35
                reasons.append('High order amount')
        except (TypeError, ValueError):
            risk_score += 10
            reasons.append('Invalid amount value')

    if payment_method == 'cod':
        risk_score += 10
        reasons.append('Cash on delivery used')

    if payment_status == 'failed':
        risk_score += 30
        reasons.append('Payment failed')

    if payload and payload.get('simulate_failure'):
        risk_score += 30
        reasons.append('Simulated failure flag')

    if payload and payload.get('discount_amount'):
        try:
            if float(payload['discount_amount']) > 200:
                risk_score += 15
                reasons.append('Large discount requested')
        except (TypeError, ValueError):
            pass

    detection_status = 'flagged' if risk_score >= 50 else 'review'
    entry = FraudDetection(
        order_id=order_id,
        payment_id=payment_id,
        user_id=user_id,
        risk_score=min(risk_score, 100),
        detection_status=detection_status,
        rule_name='heuristic-risk-scoring',
        reasons=reasons,
        metadata=redact_sensitive_payload(payload) if payload else None,
    )
    db.session.add(entry)
    return entry


def collect_evidence(user_id, session_id, entity_name, entity_id, source_type, payload=None, notes=None):
    payload_snapshot = redact_sensitive_payload(payload) if payload else None
    entry = EvidenceCollection(
        user_id=user_id,
        session_id=session_id,
        entity_name=entity_name,
        entity_id=entity_id,
        source_type=source_type,
        source_path=request.path,
        request_method=request.method,
        request_path=request.path,
        ip_address=pack_ip_address(request.headers.get('X-Forwarded-For', request.remote_addr)),
        user_agent=request.headers.get('User-Agent'),
        payload_snapshot=payload_snapshot,
        payload_hash=build_payload_hash(payload_snapshot) if payload_snapshot is not None else None,
        notes=notes,
    )
    db.session.add(entry)
    return entry


def record_security_event(user_id, session_id, event_type, message, severity='medium', metadata=None):
    entry = SecurityEvent(
        user_id=user_id,
        session_id=session_id,
        event_type=event_type,
        event_severity=severity,
        event_status='open',
        event_message=message,
        ip_address=pack_ip_address(request.headers.get('X-Forwarded-For', request.remote_addr)),
        metadata=metadata,
    )
    db.session.add(entry)
    return entry


def record_login_history_entry(user_id, session_id=None, status='success', failure_reason=None):
    entry = LoginHistory(
        user_id=user_id,
        session_id=session_id,
        login_status=status,
        failure_reason=failure_reason,
        ip_address=pack_ip_address(request.headers.get('X-Forwarded-For', request.remote_addr)),
        user_agent=request.headers.get('User-Agent'),
    )
    db.session.add(entry)
    return entry