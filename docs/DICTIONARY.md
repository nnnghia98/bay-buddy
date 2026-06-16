# Business Dictionary & i18n Rules

## Terminology Mapping
| VI Term | EN Term | Variable Name |
| :--- | :--- | :--- |
| Mã đặt chỗ | PNR / Booking Code | `pnr` |
| Số vé | Ticket Number | `ticket_number` |
| Giá gốc | Net Price | `net_price` |
| Giá net EV | EV Net Price | `ev_price` |
| Giá AST | AST Price | `ast_price` |
| Giá Thành Hoàng / Giá THF | Thành Hoàng / THF Price | `thf_price` |
| Giá bán | Selling Price | `selling_price` |
| Chiết khấu hãng | Airline Discount | `discount` |
| Thu nhập thực / Doanh thu | True Income / Revenue | `true_income` |
| Phí dịch vụ | Service Fee | `service_fee` |
| Công nợ | Balance / Debt | `balance` |
| Hành trình | Itinerary | `itinerary` |
| Nơi đi | Departure Place | `departure_place` |
| Nơi đến | Arrival Place | `arrival_place` |
| Mã nơi đi | Departure Code | `departure_code` |
| Mã nơi đến | Arrival Code | `arrival_code` |
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
