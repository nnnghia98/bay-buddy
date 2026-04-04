export default {
  customers: {
    ledger: {
      eyebrow: "Sổ công nợ",
      back: "Quay lại danh sách khách hàng",
      customerId: "Mã khách hàng",
      currentBalance: "Tổng nợ hiện tại",
      tableTitle: "Lịch sử công nợ",
      tableDescription:
        "Tất cả vé và giao dịch thanh toán được sắp xếp theo thời gian phát sinh.",
      columns: {
        date: "Ngày",
        content: "Nội dung",
        amount: "Phát sinh",
        balance: "Số dư",
      },
      loading: "Đang tải sổ công nợ khách hàng...",
      empty: "Chưa có phát sinh công nợ nào cho khách hàng này.",
      unavailableTitle: "Không tải được sổ công nợ",
      unavailableDescription:
        "Không thể tải dữ liệu khách hàng lúc này. Vui lòng thử lại.",
      fallbackContent: "Chưa có ghi chú",
    },
  },
} as const
