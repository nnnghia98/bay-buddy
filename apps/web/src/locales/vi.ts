export default {
  dashboard: {
    summary: {
      eyebrow: "Tổng quan tài chính",
      title: "Bức tranh doanh thu, lợi nhuận và công nợ từ sổ cái hiện tại.",
      description:
        "Tổng hợp này ghép số dư công nợ khách hàng với các vé đã xác nhận để tạo ra ảnh chụp nhanh cho giai đoạn đầu của Phase 5.",
      primaryAriaLabel: "Nhóm chỉ số tài chính chính",
      secondaryAriaLabel: "Nhóm chỉ số tài chính bổ sung",
      analyticsAriaLabel: "Biểu đồ doanh thu và danh sách khách nợ nhiều nhất",
      unavailableTitle: "Chưa tải được tổng quan tài chính",
      unavailableDescription:
        "Không thể đọc dữ liệu customers hoặc tickets lúc này. Vui lòng thử lại sau khi kết nối API ổn định.",
      snapshot: {
        label: "Cập nhật lúc",
        sourceLabel: "Nguồn dữ liệu",
        sourceValue: "Ledger + vé xác nhận",
      },
      commandCenter: {
        title: "Trung tâm vận hành hôm nay",
        description:
          "Theo dõi công nợ, vé, thanh toán và các việc cần xử lý tiếp theo.",
        needsAction: {
          eyebrow: "Cần xử lý",
          title: "Hàng đợi công việc",
          description:
            "Các nhóm việc có tác động trực tiếp đến công nợ và vận hành.",
        },
        queues: {
          receivables: {
            label: "Khách còn nợ",
            description: "Ưu tiên nhắc thanh toán hoặc đối soát.",
          },
          heldCredit: {
            label: "Tiền dư / đặt cọc",
            description: "Theo dõi số dư âm cần giữ hoặc hoàn lại.",
          },
          draftTickets: {
            label: "Vé nháp",
            description: "Hoàn tất xác nhận để ghi nhận công nợ.",
          },
        },
        queueAmounts: {
          receivables: "Số dư phải thu",
          heldCredit: "Số tiền đang giữ",
          draftTickets: "Giá trị vé nháp",
        },
        shortcuts: {
          eyebrow: "Thao tác nhanh",
          title: "Mở luồng làm việc",
          customers: {
            label: "Mở khách hàng",
            description: "Tìm khách và kiểm tra sổ công nợ.",
          },
          tickets: {
            label: "Nhập vé",
            description: "Tải chứng từ và trích xuất bằng AI.",
          },
          invoices: {
            label: "Hóa đơn",
            description: "Xem tài liệu tài chính theo khách hàng.",
          },
        },
        recent: {
          eyebrow: "Mới nhất",
          title: "Hoạt động gần đây",
          description: "Vé và giao dịch mới nhất trong hệ thống.",
          columns: {
            activity: "Hoạt động",
            amount: "Số tiền",
            time: "Thời gian",
          },
          empty: "Chưa có hoạt động gần đây.",
          types: {
            ticket: "Vé",
            payment: "Thanh toán",
            adjustment: "Điều chỉnh",
            refund: "Hoàn tiền",
          },
          fallbacks: {
            ticketPurchase: "Vé đã ghi nhận",
            payment: "Thanh toán",
            discount: "Chiết khấu",
            additionalFee: "Phụ thu",
            refund: "Hoàn tiền",
          },
        },
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
      analytics: {
        revenueTrend: {
          eyebrow: "Revenue Trend",
          title: "Đà tăng doanh thu 30 ngày gần nhất",
          description:
            "Nhóm theo ngày từ các giao dịch ledger tăng doanh thu để theo dõi nhịp tăng trưởng gần đây.",
          totalLabel: "Doanh thu 30 ngày",
          growthLabel: "Lũy kế hiển thị",
          tooltip: {
            daily: "Doanh thu trong ngày",
            cumulative: "Doanh thu lũy kế",
            dateLabel: "Ngày",
          },
        },
        topDebtors: {
          eyebrow: "Who Owes Me",
          title: "Top khách hàng còn nợ nhiều nhất",
          description:
            "5 khách có số dư công nợ cao nhất dựa trên chênh lệch tổng phát sinh nợ và thanh toán.",
          columns: {
            customer: "Khách hàng",
            balance: "Công nợ",
          },
          status: {
            high: "Nợ cao",
            medium: "Nợ vừa",
          },
          balanceLabel: "Số dư phải thu",
          empty: "Chưa có khách hàng nào đang còn công nợ phải thu.",
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
      invoices: {
        title: "Hóa đơn của khách hàng",
        description:
          "Mở danh sách hóa đơn được lọc theo khách hàng này để xem bản chi tiết hoặc bản in công khai.",
        open: "Xem hóa đơn",
      },
    },
  },
  financeDocuments: {
    common: {
      invoice: "Hóa đơn",
      quote: "Báo giá",
      status: "Trạng thái",
      customer: "Khách hàng",
      address: "Địa chỉ",
      taxCode: "Mã số thuế",
      createdAt: "Ngày tạo",
      issuedAt: "Ngày xuất",
      validUntil: "Hiệu lực đến",
      note: "Ghi chú",
      noNote: "Không có ghi chú",
      notUpdated: "Chưa cập nhật",
      amountInWords: "Số tiền bằng chữ",
      total: "Tổng cộng",
      taxAmount: "Thuế",
      discountAmount: "Chiết khấu",
      print: "Bản in",
      viewDetail: "Xem chi tiết",
      openPrint: "Mở bản in",
      backToInvoices: "Quay lại danh sách hóa đơn",
      backToCustomer: "Quay lại sổ khách hàng",
      snapshotNotice:
        "Dữ liệu hiển thị từ bản chụp hóa đơn/báo giá đã lưu, không lấy lại từ hồ sơ khách hàng hoặc vé hiện tại.",
      columns: {
        description: "Nội dung",
        passenger: "Hành khách",
        quantity: "SL",
        unitPrice: "Đơn giá",
        total: "Thành tiền",
      },
    },
    statuses: {
      invoice: {
        DRAFT: "Nháp",
        ISSUED: "Đã xuất",
        PAID: "Đã thanh toán",
        CANCELLED: "Đã hủy",
      },
      quote: {
        DRAFT: "Nháp",
        ACCEPTED: "Đã chấp nhận",
        EXPIRED: "Hết hiệu lực",
        CANCELLED: "Đã hủy",
      },
    },
    invoices: {
      list: {
        eyebrow: "Hóa đơn theo khách hàng",
        title: "Danh sách hóa đơn được giới hạn theo từng khách hàng.",
        description:
          "Mở từ sổ công nợ khách hàng để xem các hóa đơn đã tạo, trạng thái và bản in công khai.",
        emptyScopeTitle: "Chọn khách hàng để xem hóa đơn",
        emptyScopeDescription:
          "Danh sách hóa đơn hiện được lọc theo khách hàng. Vui lòng mở một sổ công nợ khách hàng trước, sau đó chọn mục hóa đơn.",
        emptyList: "Khách hàng này chưa có hóa đơn nào.",
      },
      detail: {
        eyebrow: "Chi tiết hóa đơn",
        titlePrefix: "Hóa đơn",
        publicLink: "Mở bản in công khai",
        lineItemsTitle: "Dòng hóa đơn",
      },
      public: {
        eyebrow: "Bản in hóa đơn",
        title: "Hóa đơn thanh toán",
        contact: "Thông tin hỗ trợ",
        lineItemsTitle: "Chi tiết dịch vụ",
      },
    },
    quotes: {
      detail: {
        eyebrow: "Chi tiết báo giá",
        titlePrefix: "Báo giá",
        lineItemsTitle: "Dòng báo giá",
        informationalNotice:
          "Báo giá chỉ mang tính thông tin và chưa ảnh hưởng đến sổ công nợ cho đến khi được chuyển thành hóa đơn.",
        convert: "Chuyển thành hóa đơn",
        converting: "Đang chuyển...",
        convertUnavailable:
          "Báo giá không còn ở trạng thái nháp nên không thể chuyển từ màn hình này.",
        convertedTitle: "Đã tạo hóa đơn",
        convertedDescription: "Báo giá đã được chuyển thành hóa đơn nháp.",
        openInvoice: "Mở hóa đơn",
      },
    },
    actions: {
      quoteConvert: {
        missingQuote: "Không tìm thấy mã báo giá.",
        missingAuth: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        permission: "Bạn không có quyền chuyển báo giá này thành hóa đơn.",
        failure: "Không thể chuyển báo giá thành hóa đơn lúc này.",
        success: "Đã chuyển báo giá thành hóa đơn.",
      },
    },
  },
} as const
