export default {
  dashboard: {
    summary: {
      eyebrow: "Tổng quan tài chính",
      title: "Bức tranh doanh thu, lợi nhuận và công nợ từ sổ cái hiện tại.",
      description:
        "Tổng hợp này ghép số dư công nợ khách hàng với các vé đã xác nhận để tạo ra ảnh chụp nhanh cho giai đoạn đầu của Phase 5.",
      primaryAriaLabel: "Nhóm chỉ số tài chính chính",
      secondaryAriaLabel: "Nhóm chỉ số tài chính bổ sung",
      unavailableTitle: "Chưa tải được tổng quan tài chính",
      unavailableDescription:
        "Không thể đọc dữ liệu customers hoặc tickets lúc này. Vui lòng thử lại sau khi kết nối API ổn định.",
      snapshot: {
        label: "Cập nhật lúc",
        sourceLabel: "Nguồn dữ liệu",
        sourceValue: "Ledger + vé xác nhận",
      },
      widgets: {
        revenue: {
          label: "Tổng doanh thu",
          detail: "vé đã xác nhận trong hệ thống.",
        },
        profit: {
          label: "Lợi nhuận ròng",
          detail: "biên lợi nhuận bình quân.",
        },
        receivables: {
          label: "Công nợ phải thu",
          detail: "khách hàng còn dư nợ.",
        },
      },
      metrics: {
        customers: {
          label: "Khách hàng đang theo dõi",
          detail: "khách hiện ở trạng thái tiền dư / đặt cọc.",
        },
        tickets: {
          label: "Vé đã ghi nhận",
          detail: "Chỉ tính các vé ở trạng thái CONFIRMED.",
        },
        credit: {
          label: "Tiền dư / đặt cọc",
          detail: "khách đang có số dư âm.",
        },
        coverage: {
          label: "Tỷ lệ công nợ / doanh thu",
          detail: "Cho biết phần doanh thu vẫn chưa thu hết.",
        },
      },
    },
  },
  customers: {
    ledger: {
      eyebrow: "Sổ công nợ",
      back: "Quay lại danh sách khách hàng",
      customerId: "Mã khách hàng",
      currentBalance: "Tổng nợ hiện tại",
      amountInWords: "Số tiền bằng chữ",
      tableTitle: "Lịch sử công nợ",
      tableDescription:
        "Tất cả vé, thanh toán và điều chỉnh công nợ được sắp xếp theo thời gian phát sinh.",
      balanceStates: {
        debt: "Khách còn nợ",
        settled: "Đã tất toán",
        credit: "Tiền dư / Đặt cọc",
      },
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
      paymentDialog: {
        open: "Ghi nhận thanh toán",
        title: "Ghi nhận thanh toán khách hàng",
        description:
          "Lưu giao dịch thanh toán mới, liên kết vé nếu cần, và cập nhật sổ công nợ ngay lập tức.",
        submit: "Lưu thanh toán",
        submitting: "Đang lưu...",
        cancel: "Đóng",
        success: "Đã ghi nhận thanh toán.",
        error: "Không thể ghi nhận thanh toán.",
        amountPlaceholder: "Chưa nhập số tiền",
        fields: {
          amount: "Số tiền",
          method: "Loại thanh toán",
          note: "Ghi chú",
          notePlaceholder: "Ví dụ: Khách chuyển khoản BIDV lúc 09:15",
          evidence: "Ảnh biên lai",
          evidenceHint:
            "Hiện hỗ trợ nhập URL ảnh biên lai. Tải file trực tiếp sẽ bổ sung sau.",
          evidenceEmpty: "Chưa có biên lai đính kèm.",
          evidenceReady: "Đã thêm URL biên lai.",
          linkedTicket: "Đối soát đích danh",
          linkedTicketPlaceholder: "Không liên kết vé cụ thể",
        },
      },
    },
  },
} as const
