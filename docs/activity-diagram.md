# Activity Diagram

```mermaid
flowchart TD
  Start([Start]) --> Browse[Browse products]
  Browse --> Select{Choose product?}
  Select -->|Yes| Details[View product details]
  Details --> Cart[Add to cart]
  Cart --> More{Continue shopping?}
  More -->|Yes| Browse
  More -->|No| Checkout[Proceed to checkout]
  Checkout --> Auth{Signed in?}
  Auth -->|No| Login[Login or register]
  Login --> Shipping[Enter shipping details]
  Auth -->|Yes| Shipping
  Shipping --> Pay[Submit payment]
  Pay --> Verify{Payment approved?}
  Verify -->|Yes| Order[Create order and invoice]
  Verify -->|No| Retry[Show payment failure]
  Retry --> Checkout
  Order --> Track[Show order history and tracking]
  Track --> End([End])
```
