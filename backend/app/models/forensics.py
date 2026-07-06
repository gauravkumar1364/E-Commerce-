from datetime import datetime

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class TransactionLog(TimestampMixin, db.Model):
    __tablename__ = 'transaction_logs'

    transaction_log_id = db.Column(db.BigInteger, primary_key=True)
    order_id = db.Column(db.BigInteger, db.ForeignKey('orders.order_id'), nullable=True)
    payment_id = db.Column(db.BigInteger, db.ForeignKey('payments.payment_id'), nullable=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=True)
    transaction_type = db.Column(db.String(100), nullable=False)
    transaction_status = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=True)
    currency_code = db.Column(db.String(3), nullable=True)
    gateway_reference = db.Column(db.String(100), nullable=True)
    risk_score = db.Column(db.Integer, nullable=False, default=0)
    transaction_metadata = db.Column(db.JSON, nullable=True)


class FraudDetection(TimestampMixin, db.Model):
    __tablename__ = 'fraud_detections'

    fraud_detection_id = db.Column(db.BigInteger, primary_key=True)
    order_id = db.Column(db.BigInteger, db.ForeignKey('orders.order_id'), nullable=True)
    payment_id = db.Column(db.BigInteger, db.ForeignKey('payments.payment_id'), nullable=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=True)
    risk_score = db.Column(db.Integer, nullable=False, default=0)
    detection_status = db.Column(db.String(50), nullable=False, default='review')
    rule_name = db.Column(db.String(100), nullable=False)
    reasons = db.Column(db.JSON, nullable=True)
    detection_metadata = db.Column(db.JSON, nullable=True)


class EvidenceCollection(TimestampMixin, db.Model):
    __tablename__ = 'evidence_collection'

    evidence_id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=True)
    session_id = db.Column(db.BigInteger, db.ForeignKey('sessions.session_id'), nullable=True)
    entity_name = db.Column(db.String(100), nullable=False)
    entity_id = db.Column(db.BigInteger, nullable=True)
    source_type = db.Column(db.String(50), nullable=False)
    source_path = db.Column(db.String(255), nullable=True)
    request_method = db.Column(db.String(10), nullable=True)
    request_path = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.LargeBinary(16), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    payload_snapshot = db.Column(db.JSON, nullable=True)
    payload_hash = db.Column(db.String(128), nullable=True)
    evidence_status = db.Column(db.String(50), nullable=False, default='collected')
    notes = db.Column(db.Text, nullable=True)