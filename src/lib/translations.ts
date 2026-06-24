export type Language = "cs" | "en";

export type TranslationParams = Record<string, string | number>;

export type TranslationValue =
  | string
  | {
      _one: string;
      _few?: string; // Czech specific: 2-4
      _many: string; // English plural, or Czech 5+ and 0
    };

export type Dictionary = Record<string, TranslationValue>;

export const translations: Record<Language, Dictionary> = {
  en: {
    // Header & Navigation
    header_title: "Knihobot Seller Estimator",
    header_estimator: "Estimator",
    header_dashboard: "Dashboard",
    header_demo_mode: "Demo Mode",

    // Main Landing / Form
    main_title: "Find out what your books are worth — before you send them.",
    main_description:
      "Build your shelf list below. Get transparent price ranges, itemized payout calculations, and stock warnings.",
    form_demo_help_title: "Demo suggestions:",
    form_demo_book_high: "Gazely",
    form_demo_book_high_badge: "High demand",
    form_demo_book_over: "Dívka ve vlaku",
    form_demo_book_over_badge: "Oversupplied",
    form_demo_book_low: "Poslední aristokratka",
    form_demo_book_low_badge: "Below threshold",
    form_add_title: "Add Book to Estimate Shelf",
    form_label_isbn: "ISBN or Book Title",
    form_placeholder_isbn: "e.g. 9788024910086 or Tajemství",
    form_label_author: "Author (Optional)",
    form_placeholder_author: "e.g. Rhonda Byrne",
    form_isbn_detected: "ISBN detected. Title lookup bypassed.",
    form_btn_scan_barcode: "Scan book barcode with camera",
    form_btn_scan_barcode_short: "Barcode",
    form_btn_scan_spine: "Scan book spines with AI vision (AI Beta)",
    form_btn_scan_spine_short: "AI spines",
    form_btn_beta: "Beta",
    form_label_condition: "Condition",
    form_condition_new: "New",
    form_condition_verygood: "Very Good",
    form_condition_good: "Good",
    form_condition_worn: "Worn",
    form_btn_add: "Add to Estimate Shelf",
    form_btn_adding: "Adding to Shelf...",
    form_error_empty: "Please enter a title or ISBN to estimate.",
    form_error_no_match: "No comparables found for this query in our snapshot.",
    form_error_invalid_isbn: "Invalid ISBN checksum.",
    form_error_fetch_failed: "Failed to fetch estimate. Please try again.",

    // Shelf Lists
    shelf_title: "Your Estimate Shelf",
    shelf_empty: "Your shelf is empty",
    shelf_empty_desc:
      "Search and add books above to estimate your shipment value.",
    shelf_summary_title: "Shipment Estimate Summary",
    shelf_total_range_desc: "Estimated payout sum of the shipment bucket.",
    shelf_kept_locally: {
      _one: "1 kept/donated locally",
      _many: "{count} kept/donated locally",
    },
    shelf_btn_send: {
      _one: "Send 1 book to Knihobot",
      _many: "Send {count} books to Knihobot",
    },
    shelf_shipment_list_title: {
      _one: "Shipment List (1 book)",
      _many: "Shipment List ({count} books)",
    },
    shelf_shipment_list_desc: "Included in payout",
    shelf_shipment_empty:
      "No books in shipment list. Adjust agency choices below to include them.",
    shelf_keep_donate_title: {
      _one: "Local Keep/Donate List (1 book)",
      _many: "Local Keep/Donate List ({count} books)",
    },
    shelf_keep_donate_title_detailed: {
      _one: "Better Kept or Donated (1 book)",
      _many: "Better Kept or Donated ({count} books)",
    },
    shelf_keep_donate_desc: "Excluded from payout",
    shelf_keep_donate_desc_detailed: "Excluded from shipment",
    shelf_keep_donate_empty: "No books in keep/donate list.",
    shelf_keep_donate_why_excluded_html:
      "<strong>Why these are excluded:</strong> These books are estimated below the earning threshold (resulting in a 0 CZK payout), or have a high oversupply warning and you decided to keep them locally to avoid potential decline or donation fees.",

    // Card details & Trust principles
    card_payout_range: "Payout Range",
    card_estimated_payout: "Estimated Payout",
    card_payout_formula: "Knihobot Payout Formula",
    card_list_price: "List price",
    card_payout_share: "Payout share",
    card_payout_fee: "Fee",
    card_earned: "Earned",
    card_copies_in_stock: "copies in stock",
    card_based_on_comparables: {
      _one: "based on 1 comparable copy",
      _many: "based on {count} comparable copies",
    },
    card_showing_top_comparables:
      "Showing top {count} of {total} recent listings in snapshot:",
    card_no_comparables_title: "General Used Book Reference Context",
    card_no_comparables_text:
      "We have no comparables for this title in our snapshot. For context, typical used books on Knihobot list for **{p25Price}–{p75Price} CZK** (typical payout **{p25Payout}–{p75Payout} CZK**). Your book's actual value may differ.",
    card_oversupply_title: "Oversupplied — May Be Declined/Donated",
    card_oversupply_text:
      "Knihobot already has many copies of this book in stock ({count} active). It might be declined or accepted only as a donation.",
    card_below_threshold_title: "Below Earning Threshold",
    card_below_threshold_text:
      "This book has low value and falls below Knihobot's payout threshold. Estimated earnings will be 0 CZK.",
    card_oversupply_checkbox: "I want to send this book anyway",
    card_btn_keep_book: "Keep Book",
    card_btn_donate_book: "Donate Book",
    card_btn_send_book: "Send Book",
    card_payout_range_short: "Payout range",

    // Form condition options (dropdown descriptions)
    form_condition_new_option: "Like New / Unread (1.2×)",
    form_condition_verygood_option: "Very Good (1.1×)",
    form_condition_good_option: "Good / Standard (1.0×)",
    form_condition_worn_option: "Worn / Damaged (0.7×)",

    // Card condition options
    card_condition_new_option: "Like New (1.2x)",
    card_condition_verygood_option: "Very Good (1.1x)",
    card_condition_good_option: "Good (1.0x)",
    card_condition_worn_option: "Worn (0.7x)",

    // Demand status labels
    demand_badge_low_stock: "low stock ({count})",
    demand_badge_supply: "supply: {count}",
    demand_badge_oversupplied: "oversupplied ({count}) ⚠️",
    demand_badge_oversupplied_title:
      "Knihobot already has many active copies. May be declined or donated.",

    // Retail & Payout short labels
    card_retail_label: "Retail:",
    card_payout_label: "Payout:",

    // Agency options
    agency_threshold_legend:
      "Below earning threshold — how would you like to handle this book?",
    agency_choice_keep_label: "Keep this book",
    agency_choice_keep_desc:
      " — Better off kept on your shelf or gifted to a friend.",
    agency_choice_donate_label: "Donate or rehome locally",
    agency_choice_donate_desc: " — Do not send; donate or recycle it yourself.",
    agency_choice_send_label: "Send anyway",
    agency_choice_send_desc:
      " — Send to Knihobot. If list prices increase, you may still earn; otherwise, it will be handled as a donation.",
    agency_oversupply_keep_prompt:
      "High supply. Do you want to keep this copy locally instead?",
    agency_normal_keep_prompt: "Do you want to keep this copy locally?",
    agency_keep_checkbox_label: "Keep Book",

    // Math breakdown
    math_toggle_label: "Show payout math breakdown",
    math_min_estimate_label: "Min Estimate Math:",
    math_max_estimate_label: "Max Estimate Math:",
    math_below_threshold: "Below threshold ({limit} CZK) → 0 CZK payout",
    math_formula_result:
      "{listPrice} CZK × {percent}% ({shareAmount} CZK) − {fee} CZK fee = <strong>{payout} CZK payout</strong>",
    card_by_author: "by ",
    currency: "CZK",
    card_below_limit_label: "Below limit",
    card_no_comparables_label: "No comparables available",

    // Comparables Peek
    peek_comparables_button: "Peek at comparables ({count})",
    peek_col_condition: "Condition",
    peek_col_price: "Price",
    peek_col_stock: "Stock",
    peek_showing_top: "Showing top 20 of {total} comparables.",

    // Checkout simulated modal
    checkout_dialog_title: "Demo Integration Preview",
    checkout_body_p1: "This is a simulated demo environment.",
    checkout_body_p2:
      "To actually sell your books on Knihobot, proceed to the real seller intake form. Your active shelf items will not be sent automatically.",
    checkout_body_p3: {
      _one: "Alternatively, click the secondary button below to simulate shipping this <strong>1 book</strong>. You can then view its progress inside your demo tracking dashboard.",
      _many:
        "Alternatively, click the secondary button below to simulate shipping these <strong>{count} books</strong>. You can then view their progress inside your demo tracking dashboard.",
    },
    checkout_cta_primary: "Proceed to real Knihobot intake (knihobot.cz) →",
    checkout_cta_secondary: "Simulate Tracking on Demo Dashboard",
    checkout_cancel: "Cancel",

    // Barcode scanner
    scanner_dialog_title: "Barcode Scanner",
    scanner_guide: "Position the book's barcode within the scan window.",
    scanner_manual_fallback:
      "Camera not available? Close and type ISBN manually.",
    scanner_camera_permission_denied_title: "Camera Permission Denied",
    scanner_camera_permission_denied_desc:
      "We need camera permission to scan barcodes. Please grant camera access in your browser settings or enter the ISBN manually.",
    scanner_generic_error_title: "Scanner Failed to Start",
    scanner_generic_error_desc:
      "Could not initialize camera scanner. Please verify that your device has a camera, or fall back to manual text input.",
    scanner_btn_manual_input: "Use Manual Input",
    scanner_btn_switch_camera: "Switch Camera",
    scanner_toast_scanned: "Scanned: {title}",
    scanner_toast_error: "Scan failed: {error}",

    // Spine scanner
    spine_dialog_title: "AI Spine Scanner",
    spine_dialog_desc: "Upload a spine photo to auto-detect multiple titles",
    spine_step_upload_title: "Upload Spine Photo",
    spine_step_upload_desc:
      "Upload a photo of book spines from your files, or take one directly on mobile.",
    spine_btn_retake: "Retake Photo",
    spine_btn_analyze: "Analyze Spines",
    spine_analyzing_title: "AI analysis in progress...",
    spine_analyzing_desc: "Recognizing spines and matching catalog values",
    spine_review_title: "Review Extracted Spines:",
    spine_review_desc:
      "Confirm the matched catalog books below. Checked titles will be added to your Estimate Shelf. Unmatched books will be added as reference unpriced items.",
    spine_col_extracted: "Extracted Spine",
    spine_col_match: "Catalog Match",
    spine_unmatched_label: "unmatched",
    spine_unmatched_desc: "Not found in catalog — will add as unpriced",
    spine_btn_discard: "Discard",
    spine_btn_add_books: {
      _one: "Add 1 Book",
      _many: "Add {count} Books",
    },
    spine_adding_books: "Adding...",
    spine_no_text_recognized: "No text was recognized from this image.",
    spine_error_title: "Spine Analysis Failed",
    spine_btn_try_another: "Try Another Photo",

    // Dashboard page
    dashboard_demo_banner:
      "Demo Preview Mode — Tracking data on this screen is simulated for demonstration purposes. No real books have been shipped or sold.",
    dashboard_title: "My Sales Tracker",
    dashboard_description:
      "Monitor your book shipments through Knihobot's receiving, pricing, and listing steps. Payouts for sold items are tracked here.",
    dashboard_paid_out: "Paid Out",
    dashboard_paid_out_sub: "Sent to bank account",
    dashboard_pending: "Pending Payout",
    dashboard_pending_sub: "Sold, waiting for payout",
    dashboard_expected: "Expected Payout",
    dashboard_expected_sub: "Priced & listed items",
    dashboard_no_shipments_title: "No shipments tracked yet",
    dashboard_no_shipments_desc:
      "Go back to the Estimator, add books to your shelf, and click 'Send to Knihobot' to simulate a shipment.",
    dashboard_expected_payout_title: "Expected Payout",
    dashboard_sent_date: "Sent {date} ({relative})",
    dashboard_payout_countdown_title: "Payout Countdown (Simulation)",
    dashboard_payout_countdown_desc: {
      _one: '"{title}" was sold. Expected Payout on {date} (1 day remaining).',
      _many:
        '"{title}" was sold. Expected Payout on {date} ({count} days remaining).',
    },
    dashboard_col_info: "Book Info",
    dashboard_col_status: "Status",
    dashboard_col_value: "Value Details",
    dashboard_evaluating: "Evaluating...",
    dashboard_listed_at: "Listed at {price} CZK",

    // Pipeline Steps
    step_received: "Received",
    step_priced: "Priced",
    step_listed: "Listed",
    step_sold: "Sold",
    step_paid: "Paid",

    // Server Action Error Codes (B1)
    API_TIMEOUT:
      "Gemini API request timed out. Please check your internet connection.",
    EMPTY_RESPONSE:
      "Empty response received from Gemini API. Please try again with a clearer picture.",
    MALFORMED_RESPONSE:
      "Gemini API returned an invalid response structure. Please try again.",
    GENERIC_ERROR:
      "Spine analysis failed. Please verify your connection or API key and try again.",

    // Additional Dashboard keys
    dashboard_loading: "Loading tracker dashboard...",
    dashboard_date_today: "today",
    dashboard_date_yesterday: "yesterday",
    dashboard_date_days_ago: {
      _one: "1 day ago",
      _many: "{count} days ago",
    },

    // Additional Scanner keys
    scanner_aria_close: "Close scanner",
    scanner_loading: "Initializing camera feed...",
    scanner_fetching: "Fetching book estimation...",
    scanner_added_no_comparables:
      "Added: ISBN {isbn} (no comparables, see shelf)",
    scanner_added_below_threshold: "Added: {title} (below earning threshold)",
    scanner_added_success:
      "Added: {title} ({payoutMin}–{payoutMax} {currency})",
    scanner_err_not_book:
      "Not a book barcode (must be EAN-13 starting 978/979)",
    scanner_err_lookup_failed: "Lookup failed.",
    scanner_err_system_error: "System error during lookup.",
    scanner_unavailable: "Scanner Unavailable",
    scanner_unsupported:
      "Camera access is unsupported on this browser. Please use the manual input to enter the ISBN.",
    scanner_no_camera:
      "No camera detected on this device. Please use manual input to enter the ISBN.",
    scanner_found_cameras: {
      _one: "Found 1 camera",
      _many: "Found {count} cameras",
    },
    scanner_active_camera: "Active camera running",
    scanner_btn_done: "Done",
    scanner_default_book_title: "Book",
    spine_unknown_author: "Unknown",
  },
  cs: {
    // Header & Navigation
    header_title: "Knihobot Oceňovač",
    header_estimator: "Oceňovač",
    header_dashboard: "Přehled",
    header_demo_mode: "Ukázka (Demo)",

    // Main Landing / Form
    main_title:
      "Zjistěte, jakou hodnotu mají vaše knihy, ještě než je pošlete.",
    main_description:
      "Vytvořte si seznam knih níže. Získáte přehledné cenové rozpětí, rozpis výplat a upozornění na stav zásob.",
    form_demo_help_title: "Tip pro ukázku (demo):",
    form_demo_book_high: "Gazely",
    form_demo_book_high_badge: "Vysoká poptávka",
    form_demo_book_over: "Dívka ve vlaku",
    form_demo_book_over_badge: "Přebytek",
    form_demo_book_low: "Poslední aristokratka",
    form_demo_book_low_badge: "Pod prahem",
    form_add_title: "Přidat knihu k ocenění",
    form_label_isbn: "ISBN nebo název knihy",
    form_placeholder_isbn: "např. 9788024910086 nebo Tajemství",
    form_label_author: "Autor (volitelně)",
    form_placeholder_author: "např. Rhonda Byrne",
    form_isbn_detected: "ISBN detekováno. Vyhledávání podle názvu přeskočeno.",
    form_btn_scan_barcode: "Naskenovat čárový kód knihy fotoaparátem",
    form_btn_scan_barcode_short: "Čárový kód",
    form_btn_scan_spine: "Naskenovat hřbety knih pomocí AI (AI Beta)",
    form_btn_scan_spine_short: "AI hřbety",
    form_btn_beta: "Beta",
    form_label_condition: "Stav",
    form_condition_new: "Nová",
    form_condition_verygood: "Velmi dobrý",
    form_condition_good: "Dobrý",
    form_condition_worn: "Opotřebená",
    form_btn_add: "Přidat na poličku k ocenění",
    form_btn_adding: "Přidávání na poličku...",
    form_error_empty: "Zadejte prosím název nebo ISBN k ocenění.",
    form_error_no_match:
      "V našem přehledu nebyly nalezeny žádné srovnatelné položky.",
    form_error_invalid_isbn: "Neplatný kontrolní součet ISBN.",
    form_error_fetch_failed:
      "Nepodařilo se načíst odhad. Zkuste to prosím znovu.",

    // Shelf Lists
    shelf_title: "Vaše police k ocenění",
    shelf_empty: "Vaše police je prázdná",
    shelf_empty_desc:
      "Vyhledejte a přidejte knihy výše, abyste odhadli hodnotu zásilky.",
    shelf_summary_title: "Shrnutí odhadu zásilky",
    shelf_total_range_desc: "Odhadovaná částka k vyplacení z této zásilky.",
    shelf_kept_locally: {
      _one: "1 ponechána/darována lokálně",
      _few: "{count} ponechány/darovány lokálně",
      _many: "{count} ponecháno/darováno lokálně",
    },
    shelf_btn_send: {
      _one: "Poslat 1 knihu do Knihobotu",
      _few: "Poslat {count} knihy do Knihobotu",
      _many: "Poslat {count} knih do Knihobotu",
    },
    shelf_shipment_list_title: {
      _one: "Seznam k odeslání (1 kniha)",
      _few: "Seznam k odeslání ({count} knihy)",
      _many: "Seznam k odeslání ({count} knih)",
    },
    shelf_shipment_list_desc: "Zahrnuto ve výplatě",
    shelf_shipment_empty:
      "Žádné knihy v seznamu k odeslání. Upravte výběr níže pro jejich zařazení.",
    shelf_keep_donate_title: {
      _one: "Ponechané/Darované (1 kniha)",
      _few: "Ponechané/Darované ({count} knihy)",
      _many: "Ponechané/Darované ({count} knih)",
    },
    shelf_keep_donate_title_detailed: {
      _one: "Raději ponechat nebo darovat (1 kniha)",
      _few: "Raději ponechat nebo darovat ({count} knihy)",
      _many: "Raději ponechat nebo darovat ({count} knih)",
    },
    shelf_keep_donate_desc: "Vyloučeno z výplaty",
    shelf_keep_donate_desc_detailed: "Vyloučeno ze zásilky",
    shelf_keep_donate_empty: "Žádné knihy k ponechání nebo darování.",
    shelf_keep_donate_why_excluded_html:
      "<strong>Proč jsou vyloučeny:</strong> Tyto knihy mají odhadovanou výplatu pod limitem (výsledná výplata 0 Kč) nebo mají varování o přeplněném stavu zásob a rozhodli jste se je ponechat lokálně, abyste se vyhnuli případnému zamítnutí nebo poplatkům za darování.",

    // Card details & Trust principles
    card_payout_range: "Výplatní rozmezí",
    card_estimated_payout: "Odhadovaná výplata",
    card_payout_formula: "Výplatní vzorec Knihobotu",
    card_list_price: "Prodejní cena",
    card_payout_share: "Výplatní podíl",
    card_payout_fee: "Poplatek",
    card_earned: "Výdělek",
    card_copies_in_stock: "kopií skladem",
    card_based_on_comparables: {
      _one: "na základě 1 srovnatelné nabídky",
      _few: "na základě {count} srovnatelných nabídek",
      _many: "na základě {count} srovnatelných nabídek",
    },
    card_showing_top_comparables:
      "Zobrazeno top {count} z {total} nedávných nabídek v databázi:",
    card_no_comparables_title: "Obecný kontext pro použité knihy",
    card_no_comparables_text:
      "Pro tento titul nemáme v databázi žádné srovnatelné nabídky. Pro kontext, běžné použité knihy se na Knihobotu prodávají za **{p25Price}–{p75Price} Kč** (běžná výplata činí **{p25Payout}–{p75Payout} Kč**). Skutečná hodnota vaší knihy se může lišit.",
    card_oversupply_title: "Přeplněný stav — Může být zamítnuto/darováno",
    card_oversupply_text:
      "Knihobot má již na skladě mnoho kopií této knihy ({count} aktivních). Může být zamítnuta nebo přijata pouze jako dar.",
    card_below_threshold_title: "Pod hranicí pro vyplácení",
    card_below_threshold_text:
      "Tato kniha má nízkou hodnotu a spadá pod minimální hranici pro vyplácení Knihobotu. Odhadovaný výdělek bude 0 Kč.",
    card_oversupply_checkbox: "Chci tuto knihu přesto poslat",
    card_btn_keep_book: "Ponechat si",
    card_btn_donate_book: "Darovat",
    card_btn_send_book: "Poslat",
    card_payout_range_short: "Rozmezí výplaty",

    // Form condition options (dropdown descriptions)
    form_condition_new_option: "Jako nová / nečtená (1,2×)",
    form_condition_verygood_option: "Velmi dobrý (1,1×)",
    form_condition_good_option: "Dobrý / standardní (1,0×)",
    form_condition_worn_option: "Opotřebená / poškozená (0,7×)",

    // Card condition options
    card_condition_new_option: "Jako nová (1.2x)",
    card_condition_verygood_option: "Velmi dobrá (1.1x)",
    card_condition_good_option: "Dobrá (1.0x)",
    card_condition_worn_option: "Opotřebená (0.7x)",

    // Demand status labels
    demand_badge_low_stock: "nízké zásoby ({count})",
    demand_badge_supply: "zásoby: {count}",
    demand_badge_oversupplied: "přeplněno ({count}) ⚠️",
    demand_badge_oversupplied_title:
      "Knihobot již má na skladě mnoho aktivních kopií. Může být zamítnuto nebo přijato pouze jako dar.",

    // Retail & Payout short labels
    card_retail_label: "Prodejní:",
    card_payout_label: "Výplata:",

    // Agency options
    agency_threshold_legend:
      "Pod hranicí pro vyplácení — jak si přejete s touto knihou naložit?",
    agency_choice_keep_label: "Ponechat si knihu",
    agency_choice_keep_desc:
      " — Lepší nechat v knihovně nebo darovat kamarádovi.",
    agency_choice_donate_label: "Darovat nebo udat lokálně",
    agency_choice_donate_desc: " — Neposílat; darujte nebo zrecyklujte sami.",
    agency_choice_send_label: "Přesto poslat",
    agency_choice_send_desc:
      " — Poslat do Knihobotu. Pokud prodejní ceny stoupnou, můžete stále vydělat; jinak bude kniha zpracována jako dar.",
    agency_oversupply_keep_prompt:
      "Vysoké zásoby. Chcete si tuto kopii raději ponechat lokálně?",
    agency_normal_keep_prompt: "Chcete si tuto kopii ponechat lokálně?",
    agency_keep_checkbox_label: "Ponechat si",

    // Math breakdown
    math_toggle_label: "Zobrazit rozpis výpočtu výplaty",
    math_min_estimate_label: "Výpočet pro minimální odhad:",
    math_max_estimate_label: "Výpočet pro maximální odhad:",
    math_below_threshold: "Pod limitem ({limit} Kč) → 0 Kč výplata",
    math_formula_result:
      "{listPrice} Kč × {percent}% ({shareAmount} Kč) − poplatek {fee} Kč = <strong>výplata {payout} Kč</strong>",
    card_by_author: "od ",
    currency: "Kč",
    card_below_limit_label: "Pod limitem",
    card_no_comparables_label: "Srovnatelné nabídky nejsou k dispozici",

    // Comparables Peek
    peek_comparables_button: "Zobrazit srovnatelné nabídky ({count})",
    peek_col_condition: "Stav",
    peek_col_price: "Prodejní cena",
    peek_col_stock: "Skladem",
    peek_showing_top: "Zobrazeno top 20 z {total} srovnatelných nabídek.",

    // Checkout simulated modal
    checkout_dialog_title: "Náhled ukázky odeslání",
    checkout_body_p1: "Toto je simulované ukázkové prostředí.",
    checkout_body_p2:
      "Chcete-li své knihy skutečně prodat na Knihobotu, přejděte na jejich oficiální formulář. Položky na vaší poličce nebudou odeslány automaticky.",
    checkout_body_p3: {
      _one: "Případně klikněte na tlačítko níže a nasimulujte odeslání této <strong>1 knihy</strong>. Poté můžete sledovat její průběh na ukázkovém sledovacím panelu.",
      _few: "Případně klikněte na tlačítko níže a nasimulujte odeslání těchto <strong>{count} knih</strong>. Poté můžete sledovat jejich průběh na ukázkovém sledovacím panelu.",
      _many:
        "Případně klikněte na tlačítko níže a nasimulujte odeslání těchto <strong>{count} knih</strong>. Poté můžete sledovat jejich průběh na ukázkovém sledovacím panelu.",
    },
    checkout_cta_primary: "Přejít na skutečný příjem Knihobotu (knihobot.cz) →",
    checkout_cta_secondary: "Simulovat sledování na ukázkovém přehledu",
    checkout_cancel: "Zrušit",

    // Barcode scanner
    scanner_dialog_title: "Čtečka čárových kódů",
    scanner_guide: "Umístěte čárový kód knihy do okénka skenování.",
    scanner_manual_fallback:
      "Fotoaparát není k dispozici? Zavřete čtečku a zadejte ISBN ručně.",
    scanner_camera_permission_denied_title: "Přístup k fotoaparátu odepřen",
    scanner_camera_permission_denied_desc:
      "Ke skenování čárových kódů potřebujeme přístup k fotoaparátu. Povolte prosím fotoaparát v nastavení prohlížeče nebo zadejte ISBN ručně.",
    scanner_generic_error_title: "Skenování se nepodařilo spustit",
    scanner_generic_error_desc:
      "Nelze inicializovat čtečku. Ověřte, zda vaše zařízení disponuje fotoaparátem, nebo zadejte kód ručně v textovém poli.",
    scanner_btn_manual_input: "Zadat ručně",
    scanner_btn_switch_camera: "Přepnout fotoaparát",
    scanner_toast_scanned: "Naskenováno: {title}",
    scanner_toast_error: "Skenování selhalo: {error}",

    // Spine scanner
    spine_dialog_title: "AI skener hřbetů",
    spine_dialog_desc:
      "Nahrajte fotografii hřbetů pro automatickou detekci více knih najednou",
    spine_step_upload_title: "Nahrajte fotografii hřbetů",
    spine_step_upload_desc:
      "Vyberte fotografii hřbetů ze svých souborů, nebo ji pořiďte přímo na telefonu.",
    spine_btn_retake: "Vyfotit znovu",
    spine_btn_analyze: "Analyzovat hřbety",
    spine_analyzing_title: "Probíhá analýza pomocí AI...",
    spine_analyzing_desc: "Rozpoznávání hřbetů a vyhledávání v katalogu",
    spine_review_title: "Zkontrolujte rozpoznané knihy:",
    spine_review_desc:
      "Potvrďte níže spárované knihy z katalogu. Zaškrtnuté knihy budou přidány na polici. Nespárované knihy budou přidány jako neoceněné.",
    spine_col_extracted: "Rozpoznaný hřbet",
    spine_col_match: "Shoda v katalogu",
    spine_unmatched_label: "nenalezeno",
    spine_unmatched_desc: "Nenalezeno v katalogu — bude přidáno jako neoceněné",
    spine_btn_discard: "Zahodit",
    spine_btn_add_books: {
      _one: "Přidat 1 knihu",
      _few: "Přidat {count} knihy",
      _many: "Přidat {count} knih",
    },
    spine_adding_books: "Přidávání...",
    spine_no_text_recognized:
      "Z tohoto obrázku se nepodařilo rozpoznat žádný text.",
    spine_error_title: "Analýza hřbetů selhala",
    spine_btn_try_another: "Zkusit jinou fotku",

    // Dashboard page
    dashboard_demo_banner:
      "Ukázkový demo režim — Sledovaná data na této obrazovce jsou simulována pro demonstrační účely. Žádné skutečné knihy nebyly odeslány ani prodány.",
    dashboard_title: "Sledování mých prodejů",
    dashboard_description:
      "Sledujte své zásilky knih přes fáze příjmu, ocenění a vystavení na Knihobotu. Výplaty za prodané knihy jsou sledovány zde.",
    dashboard_paid_out: "Vyplaceno",
    dashboard_paid_out_sub: "Odesláno na bankovní účet",
    dashboard_pending: "Čeká na vyplacení",
    dashboard_pending_sub: "Prodáno, čeká na odeslání peněz",
    dashboard_expected: "Očekávaná výplata",
    dashboard_expected_sub: "Oceněné & vystavené položky",
    dashboard_no_shipments_title: "Zatím žádné sledované zásilky",
    dashboard_no_shipments_desc:
      "Vraťte se do Oceňovače, přidejte knihy na polici a kliknutím na 'Poslat do Knihobotu' nasimulujte zásilku.",
    dashboard_expected_payout_title: "Očekávaná výplata",
    dashboard_sent_date: "Odesláno {date} ({relative})",
    dashboard_payout_countdown_title: "Odpočet k výplatě (Simulace)",
    dashboard_payout_countdown_desc: {
      _one: 'Kniha "{title}" byla prodána. Očekávaná výplata {date} (zbývá 1 den).',
      _few: 'Kniha "{title}" byla prodána. Očekávaná výplata {date} (zbývají {count} dny).',
      _many:
        'Kniha "{title}" byla prodána. Očekávaná výplata {date} (zbývá {count} dní).',
    },
    dashboard_col_info: "Informace o knize",
    dashboard_col_status: "Stav",
    dashboard_col_value: "Detaily ceny",
    dashboard_evaluating: "Oceňuje se...",
    dashboard_listed_at: "Vystaveno za {price} Kč",

    // Pipeline Steps
    step_received: "Přijato",
    step_priced: "Oceněno",
    step_listed: "Vystaveno",
    step_sold: "Prodáno",
    step_paid: "Vyplaceno",

    // Server Action Error Codes (B1)
    API_TIMEOUT:
      "Požadavek na rozhraní Gemini vypršel. Zkontrolujte připojení k internetu.",
    EMPTY_RESPONSE:
      "Z rozhraní Gemini byla přijata prázdná odpověď. Zkuste to znovu s jasnějším snímkem.",
    MALFORMED_RESPONSE:
      "Rozhraní Gemini vrátilo neplatnou strukturu odpovědi. Zkuste to znovu.",
    GENERIC_ERROR:
      "Analýza hřbetů selhala. Zkontrolujte připojení nebo klíč API a zkuste to znovu.",

    // Additional Dashboard keys
    dashboard_loading: "Načítání přehledu prodejů...",
    dashboard_date_today: "dnes",
    dashboard_date_yesterday: "včera",
    dashboard_date_days_ago: {
      _one: "před 1 dnem",
      _few: "před {count} dny",
      _many: "před {count} dny",
    },

    // Additional Scanner keys
    scanner_aria_close: "Zavřít čtečku",
    scanner_loading: "Inicializace fotoaparátu...",
    scanner_fetching: "Načítání odhadu knihy...",
    scanner_added_no_comparables:
      "Přidáno: ISBN {isbn} (srovnatelné nabídky nenalezeny, viz police)",
    scanner_added_below_threshold:
      "Přidáno: {title} (pod hranicí pro vyplácení)",
    scanner_added_success:
      "Přidáno: {title} ({payoutMin}–{payoutMax} {currency})",
    scanner_err_not_book:
      "Toto není čárový kód knihy (musí to být EAN-13 začínající 978/979)",
    scanner_err_lookup_failed: "Vyhledávání selhalo.",
    scanner_err_system_error: "Systémová chyba při vyhledávání.",
    scanner_unavailable: "Čtečka nedostupná",
    scanner_unsupported:
      "Přístup k fotoaparátu není v tomto prohlížeči podporován. Zadejte prosím ISBN ručně.",
    scanner_no_camera:
      "Na tomto zařízení nebyl detekován žádný fotoaparát. Zadejte prosím ISBN ručně.",
    scanner_found_cameras: {
      _one: "Nalezen 1 fotoaparát",
      _few: "Nalezeny {count} fotoaparáty",
      _many: "Nalezeno {count} fotoaparátů",
    },
    scanner_active_camera: "Aktivní fotoaparát spuštěn",
    scanner_btn_done: "Hotovo",
    scanner_default_book_title: "Kniha",
    spine_unknown_author: "Neznámý autor",
  },
};

function getCzechPluralKey(count: number): "_one" | "_few" | "_many" {
  const abs = Math.abs(count);
  if (abs === 1) return "_one";
  if (abs >= 2 && abs <= 4) return "_few";
  return "_many";
}

function getEnglishPluralKey(count: number): "_one" | "_many" {
  return Math.abs(count) === 1 ? "_one" : "_many";
}

// Pure translation engine function (N2)
export function translate(
  lang: Language,
  key: string,
  params?: TranslationParams
): string {
  const dict = translations[lang] || translations.en;
  const value = dict[key];

  if (value === undefined) {
    // If not found in current language, fallback to English
    const fallbackValue = translations.en[key];
    if (fallbackValue === undefined) {
      return key; // return key as fallback
    }
    return resolveValue(lang, fallbackValue, params);
  }

  return resolveValue(lang, value, params);
}

function resolveValue(
  lang: Language,
  value: TranslationValue,
  params?: TranslationParams
): string {
  let text = "";

  if (typeof value === "string") {
    text = value;
  } else {
    // It's a plural map structure
    const count = typeof params?.count === "number" ? params.count : 0;
    if (lang === "cs") {
      const pluralKey = getCzechPluralKey(count);
      text = value[pluralKey] || value._many || value._one;
    } else {
      const pluralKey = getEnglishPluralKey(count);
      text = value[pluralKey] || value._many;
    }
  }

  // Interpolate placeholders
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
    });
  }

  return text;
}
