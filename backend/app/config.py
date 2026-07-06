import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'change-me')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-me-too')
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_TYPE = 'Bearer'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', '15'))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES_DAYS', '30'))
    )
    SESSION_TIMEOUT_SECONDS = int(os.getenv('SESSION_TIMEOUT_SECONDS', '1800'))
    CSRF_TOKEN_MAX_AGE_SECONDS = int(os.getenv('CSRF_TOKEN_MAX_AGE_SECONDS', '1800'))
    _db_url = os.getenv('MYSQL_URL') or os.getenv('DATABASE_URL') or 'mysql+pymysql://root:password@localhost:3306/ecommerce_db'
    SQLALCHEMY_DATABASE_URI = _db_url.replace('mysql://', 'mysql+pymysql://', 1) if _db_url.startswith('mysql://') else _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
    REMEMBER_COOKIE_SECURE = os.getenv('REMEMBER_COOKIE_SECURE', 'true').lower() == 'true'
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = os.getenv('REMEMBER_COOKIE_SAMESITE', 'Lax')
    JWT_COOKIE_SECURE = os.getenv('JWT_COOKIE_SECURE', 'true').lower() == 'true'
    JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'Lax')
    EMAIL_VERIFICATION_TOKEN_MAX_AGE_MINUTES = int(
        os.getenv('EMAIL_VERIFICATION_TOKEN_MAX_AGE_MINUTES', '60')
    )
    PASSWORD_RESET_TOKEN_MAX_AGE_MINUTES = int(
        os.getenv('PASSWORD_RESET_TOKEN_MAX_AGE_MINUTES', '30')
    )
    EXPOSE_SECURITY_TOKENS = os.getenv('EXPOSE_SECURITY_TOKENS', 'true').lower() == 'true'
    SMTP_HOST = os.getenv('SMTP_HOST', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    SMTP_SENDER = os.getenv('SMTP_SENDER', 'no-reply@example.com')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH_BYTES', str(5 * 1024 * 1024)))
    MAX_UPLOAD_SIZE_BYTES = int(os.getenv('MAX_UPLOAD_SIZE_BYTES', str(5 * 1024 * 1024)))
    ALLOWED_UPLOAD_EXTENSIONS = {extension.strip().lower() for extension in os.getenv('ALLOWED_UPLOAD_EXTENSIONS', 'jpg,jpeg,png,webp,pdf').split(',') if extension.strip()}
    ALLOWED_UPLOAD_MIMETYPES = {mimetype.strip().lower() for mimetype in os.getenv('ALLOWED_UPLOAD_MIMETYPES', 'image/jpeg,image/png,image/webp,application/pdf').split(',') if mimetype.strip()}
    RATE_LIMIT_DEFAULT = (int(os.getenv('RATE_LIMIT_DEFAULT_COUNT', '300')), int(os.getenv('RATE_LIMIT_DEFAULT_WINDOW_SECONDS', '60')))