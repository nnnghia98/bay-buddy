# Business Dictionary & i18n Rules

## Terminology Mapping
| VI Term | EN Term | Variable Name |
| :--- | :--- | :--- |
| Mã đặt chỗ | PNR / Booking Code | `pnr` |
| Giá gốc | Net Price | `net_price` |
| Giá bán | Selling Price | `selling_price` |
| Phí dịch vụ | Service Fee | `service_fee` |
| Công nợ | Balance / Debt | `balance` |
| Hành trình | Itinerary | `itinerary` |
| Chặng bay | Segment | `segment` |
| Giao dịch | Transaction | `transaction` |
| Số tiền | Amount | `amount` |
| Phương thức thanh toán | Payment Method | `method` |
| Trạng thái | Status | `status` |
| Ghi chú | Note | `note` |

## Localization Rules
- **Primary Locale**: `vi` (Vietnamese).
- **Secondary Locale**: `en` (English).
- **Currency Format**: Use `vi-VN` (e.g., `1.500.000 ₫`).
- **Date Format**: Use `DD/MM/YYYY` for UI; `ISO-8601` for API/DB.