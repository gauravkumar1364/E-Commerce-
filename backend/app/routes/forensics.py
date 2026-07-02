from datetime import datetime

from flask import Blueprint, jsonify, request

from app.decorators import role_required
from app.models.auth import AuditLog, LoginHistory, SecurityEvent, User
from app.models.commerce import Order
from app.models.product import Product
from app.models.forensics import EvidenceCollection, FraudDetection, TransactionLog

forensics_bp = Blueprint('forensics', __name__, url_prefix='/forensics')


def parse_int(value, field_name, minimum=None, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f'{field_name} must be an integer')
    if minimum is not None and parsed < minimum:
        raise ValueError(f'{field_name} must be greater than or equal to {minimum}')
    if maximum is not None and parsed > maximum:
        raise ValueError(f'{field_name} must be less than or equal to {maximum}')
    return parsed


def paginate(query):
    page = parse_int(request.args.get('page', 1), 'page', minimum=1)
    per_page = parse_int(request.args.get('per_page', 20), 'per_page', minimum=1, maximum=100)
    total = query.order_by(None).count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        'items': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page if total else 0,
        },
    }


def audit_entry(entry):
    return {
        'audit_log_id': entry.audit_log_id,
        'actor_user_id': entry.actor_user_id,
        'entity_name': entry.entity_name,
        'entity_id': entry.entity_id,
        'action_type': entry.action_type,
        'old_values': entry.old_values,
        'new_values': entry.new_values,
        'created_at': entry.created_at.isoformat() if entry.created_at else None,
        'user_agent': entry.user_agent,
    }


def login_entry(entry):
    return {
        'login_history_id': entry.login_history_id,
        'user_id': entry.user_id,
        'session_id': entry.session_id,
        'login_status': entry.login_status,
        'failure_reason': entry.failure_reason,
        'logged_in_at': entry.logged_in_at.isoformat() if entry.logged_in_at else None,
    }


def security_entry(entry):
    return {
        'security_event_id': entry.security_event_id,
        'user_id': entry.user_id,
        'session_id': entry.session_id,
        'event_type': entry.event_type,
        'event_severity': entry.event_severity,
        'event_status': entry.event_status,
        'event_message': entry.event_message,
        'created_at': entry.created_at.isoformat() if entry.created_at else None,
    }


def transaction_entry(entry):
    return {
        'transaction_log_id': entry.transaction_log_id,
        'order_id': entry.order_id,
        'payment_id': entry.payment_id,
        'user_id': entry.user_id,
        'transaction_type': entry.transaction_type,
        'transaction_status': entry.transaction_status,
        'amount': float(entry.amount) if entry.amount is not None else None,
        'currency_code': entry.currency_code,
        'gateway_reference': entry.gateway_reference,
        'risk_score': entry.risk_score,
        'created_at': entry.created_at.isoformat() if entry.created_at else None,
    }


def fraud_entry(entry):
    return {
        'fraud_detection_id': entry.fraud_detection_id,
        'order_id': entry.order_id,
        'payment_id': entry.payment_id,
        'user_id': entry.user_id,
        'risk_score': entry.risk_score,
        'detection_status': entry.detection_status,
        'rule_name': entry.rule_name,
        'reasons': entry.reasons,
        'created_at': entry.created_at.isoformat() if entry.created_at else None,
    }


def evidence_entry(entry):
    return {
        'evidence_id': entry.evidence_id,
        'user_id': entry.user_id,
        'session_id': entry.session_id,
        'entity_name': entry.entity_name,
        'entity_id': entry.entity_id,
        'source_type': entry.source_type,
        'request_method': entry.request_method,
        'request_path': entry.request_path,
        'evidence_status': entry.evidence_status,
        'created_at': entry.created_at.isoformat() if entry.created_at else None,
    }


def add_months(year, month, delta):
    total_months = year * 12 + (month - 1) + delta
    return total_months // 12, total_months % 12 + 1


def build_month_labels(month_count=6):
    now = datetime.utcnow()
    labels = []
    for offset in range(month_count - 1, -1, -1):
        year, month = add_months(now.year, now.month, -offset)
        labels.append(datetime(year, month, 1).strftime('%b %Y'))
    return labels


def build_month_series(month_labels):
    return {label: 0 for label in month_labels}


def month_label_for(value):
    return value.strftime('%b %Y') if value else None


def build_dashboard_metrics():
    month_labels = build_month_labels()
    revenue_series = build_month_series(month_labels)
    order_series = build_month_series(month_labels)
    login_series = build_month_series(month_labels)
    security_series = build_month_series(month_labels)
    fraud_series = build_month_series(month_labels)

    revenue_statuses = {'paid', 'processing', 'shipped', 'completed'}

    for order in Order.query.order_by(Order.created_at.asc()).all():
        label = month_label_for(order.created_at)
        if label in order_series:
            order_series[label] += 1
        if label in revenue_series and order.order_status in revenue_statuses:
            revenue_series[label] += float(order.total_amount or 0)

    for login_attempt in LoginHistory.query.order_by(LoginHistory.logged_in_at.asc()).all():
        label = month_label_for(login_attempt.logged_in_at)
        if label in login_series:
            login_series[label] += 1

    for security_event in SecurityEvent.query.order_by(SecurityEvent.created_at.asc()).all():
        label = month_label_for(security_event.created_at)
        if label in security_series:
            security_series[label] += 1

    for fraud_detection in FraudDetection.query.order_by(FraudDetection.created_at.asc()).all():
        label = month_label_for(fraud_detection.created_at)
        if label in fraud_series:
            fraud_series[label] += 1

    summary = {
        'total_users': User.query.count(),
        'revenue': round(sum(revenue_series.values()), 2),
        'orders': Order.query.count(),
        'products': Product.query.count(),
        'login_attempts': LoginHistory.query.count(),
        'security_alerts': SecurityEvent.query.count(),
        'fraud_alerts': FraudDetection.query.count(),
    }

    return {
        'summary': summary,
        'charts': {
            'revenue_by_month': {
                'labels': month_labels,
                'values': [revenue_series[label] for label in month_labels],
            },
            'activity_by_month': {
                'labels': month_labels,
                'series': {
                    'orders': [order_series[label] for label in month_labels],
                    'login_attempts': [login_series[label] for label in month_labels],
                    'security_alerts': [security_series[label] for label in month_labels],
                    'fraud_alerts': [fraud_series[label] for label in month_labels],
                },
            },
        },
    }


@forensics_bp.get('/logs')
@role_required('Admin')
def logs_overview():
    audit = paginate(AuditLog.query.order_by(AuditLog.created_at.desc()))
    login_history = paginate(LoginHistory.query.order_by(LoginHistory.logged_in_at.desc()))
    security_events = paginate(SecurityEvent.query.order_by(SecurityEvent.created_at.desc()))
    transaction_logs = paginate(TransactionLog.query.order_by(TransactionLog.created_at.desc()))
    fraud_detections = paginate(FraudDetection.query.order_by(FraudDetection.created_at.desc()))
    evidence = paginate(EvidenceCollection.query.order_by(EvidenceCollection.created_at.desc()))

    return jsonify(
        {
            'audit_logs': [audit_entry(entry) for entry in audit['items']],
            'login_history': [login_entry(entry) for entry in login_history['items']],
            'security_events': [security_entry(entry) for entry in security_events['items']],
            'transaction_logs': [transaction_entry(entry) for entry in transaction_logs['items']],
            'fraud_detections': [fraud_entry(entry) for entry in fraud_detections['items']],
            'evidence': [evidence_entry(entry) for entry in evidence['items']],
            'summary': {
                'audit_logs_count': audit['pagination']['total'],
                'login_history_count': login_history['pagination']['total'],
                'security_events_count': security_events['pagination']['total'],
                'transaction_logs_count': transaction_logs['pagination']['total'],
                'fraud_detections_count': fraud_detections['pagination']['total'],
                'evidence_count': evidence['pagination']['total'],
            },
        }
    ), 200


@forensics_bp.get('/dashboard')
@role_required('Admin')
def dashboard_metrics():
    payload = build_dashboard_metrics()
    payload['recent_activity'] = {
        'security_events': [
            security_entry(entry)
            for entry in SecurityEvent.query.order_by(SecurityEvent.created_at.desc()).limit(5).all()
        ],
        'fraud_detections': [
            fraud_entry(entry)
            for entry in FraudDetection.query.order_by(FraudDetection.created_at.desc()).limit(5).all()
        ],
        'login_history': [
            login_entry(entry)
            for entry in LoginHistory.query.order_by(LoginHistory.logged_in_at.desc()).limit(5).all()
        ],
    }
    return jsonify(payload), 200


@forensics_bp.get('/audit-logs')
@role_required('Admin')
def audit_logs():
    page = paginate(AuditLog.query.order_by(AuditLog.created_at.desc()))
    return jsonify({'items': [audit_entry(entry) for entry in page['items']], 'pagination': page['pagination']}), 200


@forensics_bp.get('/login-history')
@role_required('Admin')
def login_history():
    page = paginate(LoginHistory.query.order_by(LoginHistory.logged_in_at.desc()))
    return jsonify({'items': [login_entry(entry) for entry in page['items']], 'pagination': page['pagination']}), 200


@forensics_bp.get('/security-events')
@role_required('Admin')
def security_events():
    page = paginate(SecurityEvent.query.order_by(SecurityEvent.created_at.desc()))
    return jsonify({'items': [security_entry(entry) for entry in page['items']], 'pagination': page['pagination']}), 200


@forensics_bp.get('/transaction-logs')
@role_required('Admin')
def transaction_logs():
    page = paginate(TransactionLog.query.order_by(TransactionLog.created_at.desc()))
    return jsonify({'items': [transaction_entry(entry) for entry in page['items']], 'pagination': page['pagination']}), 200


@forensics_bp.get('/fraud-detections')
@role_required('Admin')
def fraud_detections():
    page = paginate(FraudDetection.query.order_by(FraudDetection.created_at.desc()))
    return jsonify({'items': [fraud_entry(entry) for entry in page['items']], 'pagination': page['pagination']}), 200


@forensics_bp.get('/evidence')
@role_required('Admin')
def evidence():
    page = paginate(EvidenceCollection.query.order_by(EvidenceCollection.created_at.desc()))
    return jsonify({'items': [evidence_entry(entry) for entry in page['items']], 'pagination': page['pagination']}), 200