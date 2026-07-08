import os
from sqlalchemy import text
from app import create_app
from app.extensions import db

# Import all models to ensure they are registered with SQLAlchemy
from app.models.auth import Role, User, AuthSession, LoginHistory, AuditLog, SecurityEvent
from app.models.product import Category, Product, ProductImage
from app.models.commerce import Cart, CartItem, Wishlist, WishlistItem, Order, OrderItem, Payment
from app.models.forensics import TransactionLog, FraudDetection, EvidenceCollection

def init_db():
    app = create_app()
    with app.app_context():
        print("Creating database tables if they don't exist...")
        db.create_all()
        print("Database tables created successfully!")

        # Check if we need to seed
        role_count = Role.query.count()
        if role_count == 0:
            print("Database is empty. Seeding data from seeds.sql...")
            seeds_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'seeds.sql')
            
            if os.path.exists(seeds_path):
                with open(seeds_path, 'r', encoding='utf-8') as f:
                    sql_script = f.read()
                
                # Split the script into separate statements
                statements = sql_script.split(';')
                for statement in statements:
                    if statement.strip():
                        db.session.execute(text(statement))
                
                db.session.commit()
                print("Database seeded successfully!")
            else:
                print(f"Warning: Seed file not found at {seeds_path}")
        else:
            print("Database already contains data. Skipping seed.")

        # Create default admin if none exists
        admin_role = Role.query.filter_by(role_name='Admin').first()
        if admin_role:
            admin_exists = User.query.filter_by(role_id=admin_role.role_id).first()
            if not admin_exists:
                from datetime import datetime, timezone
                admin = User(
                    role=admin_role,
                    first_name='Admin',
                    last_name='ShopZen',
                    email='admin@shopzen.in',
                    is_active=True,
                    email_verified_at=datetime.now(timezone.utc),
                )
                admin.set_password('Admin@123')
                db.session.add(admin)
                db.session.commit()
                print('Default admin user created: admin@shopzen.in / Admin@123')
            else:
                print('Admin user already exists. Skipping.')

if __name__ == '__main__':
    init_db()
