//+------------------------------------------------------------------+
//|       Kamar Signal Advisor - v2.05 Final Corrected End Zone Filter   |
//|       EA draws zones on chart and sends Telegram alerts|
//+------------------------------------------------------------------+
#property strict
#property version   "2.05"
#property description "Kamar Signal Advisor - v2.05 + Website Update Step 24AO"


//+------------------------------------------------------------------+
//|                    KAMAR SIGNAL ADVISOR LICENSE SETTINGS                    |
//|  UBAH BAGIAN INI SEBELUM COMPILE UNTUK SETIAP CLIENT / MEMBER    |
//+------------------------------------------------------------------+
#define LICENSE_ACCOUNT_ID        0
#define LICENSE_COMPANY_KEYWORD   "TradeMax Global Limited"
#define LICENSE_SERVER_KEYWORD_1  "TradeMaxGlobal-Live"
#define LICENSE_SERVER_KEYWORD_2  "TradeMaxGlobal-Live2"
#define LICENSE_UNLIMITED         true
#define LICENSE_EXPIRED_DATE      D'2099.12.31 23:59'

bool g_licenseAlertShown = false;

bool TextContainsKeyword(const string source,const string keyword)
{
   if(keyword == "")
      return(true);
   return(StringFind(source,keyword) >= 0);
}

bool CheckKamarLicense()
{
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   string company = AccountInfoString(ACCOUNT_COMPANY);
   string server = AccountInfoString(ACCOUNT_SERVER);

   if(LICENSE_ACCOUNT_ID > 0 && login != LICENSE_ACCOUNT_ID)
   {
      if(!g_licenseAlertShown)
      {
         Alert("Kamar Signal Advisor license rejected: Account ID tidak sesuai.");
         Print("Kamar Signal Advisor license rejected | Login=",login," | Allowed=",LICENSE_ACCOUNT_ID);
         g_licenseAlertShown = true;
      }
      return(false);
   }

   if(!TextContainsKeyword(company,LICENSE_COMPANY_KEYWORD))
   {
      if(!g_licenseAlertShown)
      {
         Alert("Kamar Signal Advisor license rejected: Broker/company tidak sesuai.");
         Print("Kamar Signal Advisor license rejected | Company=",company," | Required=",LICENSE_COMPANY_KEYWORD);
         g_licenseAlertShown = true;
      }
      return(false);
   }

   bool serverOk = TextContainsKeyword(server,LICENSE_SERVER_KEYWORD_1) || TextContainsKeyword(server,LICENSE_SERVER_KEYWORD_2);
   if(!serverOk)
   {
      if(!g_licenseAlertShown)
      {
         Alert("Kamar Signal Advisor license rejected: Server tidak sesuai.");
         Print("Kamar Signal Advisor license rejected | Server=",server," | Allowed=",LICENSE_SERVER_KEYWORD_1," / ",LICENSE_SERVER_KEYWORD_2);
         g_licenseAlertShown = true;
      }
      return(false);
   }

   if(!LICENSE_UNLIMITED && TimeCurrent() > LICENSE_EXPIRED_DATE)
   {
      if(!g_licenseAlertShown)
      {
         Alert("Kamar Signal Advisor license rejected: EA sudah expired.");
         Print("Kamar Signal Advisor license rejected | Expired=",TimeToString(LICENSE_EXPIRED_DATE,TIME_DATE|TIME_MINUTES));
         g_licenseAlertShown = true;
      }
      return(false);
   }

   return(true);
}

//====================================================================
// INPUT - USER FRIENDLY NAMES
//====================================================================
enum ENUM_ZONE_ALERT_FILTER
{
   All_Active_Zones     = 0, // Semua zona aktif
   Fresh_Zones_Only     = 1, // Hanya zona fresh / belum disentuh
   Remaining_Zones_Only = 2  // Hanya zona remaining / sisa zona setelah disentuh
};

enum ENUM_SAME_CANDLE_UPDATE_MODE
{
   Tick_Confirmed_Only   = 0, // Terbaik: update cepat hanya jika EA melihat tick masuk zona dulu
   Conservative_Next_Bar = 1, // Aman: update profit/TP dari candle berikutnya saja
   Aggressive_OHLC      = 2  // Agresif: pakai OHLC candle yang sama, rawan salah urutan
};

input string Section_01_Zone_Logic = "===== 01. LOGIC ZONA =====";
const bool   Show_Remaining_Zone          = true;   // Internal: zona tersentuh tetap dipantau sampai break/invalid
input ENUM_ZONE_ALERT_FILTER Chart_Zone_Filter = All_Active_Zones; // Filter zona yang tampil di chart
// v1.78: Last Call profit dikunci hanya dari urutan tick realtime setelah signal dikirim dan setelah harga benar-benar masuk zona.
// Chart_Zone_Filter hanya menyaring zona kandidat yang belum aktif/belum dikirim alert.
const bool   Keep_Alerted_Zones_Visible_Until_Invalid = true;
const bool   Keep_Touched_Zones_Visible_Until_Invalid = true;   // Internal: zona yang sudah tersentuh tetap tampil sampai invalid/break
const bool   Rebuild_Zones_When_Filter_Changed = true;
const bool   Delete_Broken_Zones          = true;
const bool   Keep_Touched_Zones_Until_Break = true;
const int    Max_Active_Zones             = 0;      // Internal: 0 = zona chart tidak dibatasi; zona hanya hilang jika break invalid
const bool   Use_Close_For_Dealing        = true;
const bool   Require_Closed_Dealing_Candle = true;
const int    Tolerance_Ticks              = 0;
const bool   Use_Doji_As_Opposite_Candle  = false;
input double Break_Point_Price            = 0.0;    // Buffer break invalid dalam harga. 0 = hilang saat close candle break batas zona
input int    Lookback_Bars                = 1200;   // Jumlah candle historis yang dianalisis
input bool   Use_Dealing_Candle_Filter    = false;  // Filter dealing candle: zona valid hanya jika close dealing keluar minimal dari potensi zona
input int    Min_Dealing_Close_Distance_Points = 300; // Minimal jarak close dealing dari batas potensi zona dalam POINT
input bool   Use_Zone_End_Adjustment_Filter = false; // Filter akhiran zona: aktifkan koreksi end zone berdasarkan Open Mother
input bool   Adjust_End_To_Mother_Extreme   = true;  // Jika trigger Open Mother valid: Demand ke Low Mother, Supply ke High Mother
input bool   Adjust_End_To_Dealing_Extreme  = true;  // Setelah trigger Mother valid: Demand ke Low Dealing bila lebih rendah, Supply ke High Dealing bila lebih tinggi

input string Section_02_Visual = "===== 02. TAMPILAN ZONA DI CHART =====";
input bool   Show_Zones_On_Chart          = true;        // Tampilkan zona di chart
input bool   Extend_Zones_To_Right         = true;        // Zona aktif selalu dipanjangkan ke kanan chart
input int    Zone_Right_Extend_Bars        = 1;           // Minimal jarak ujung zona: 1 = satu candle di kanan candle berjalan
input int    Max_Chart_Zones              = 0;           // Maksimal zona aktif yang tampil di chart. 0 = semua zona aktif
input int    Chart_Max_Distance_Points    = 0;           // Batas jarak zona chart dari BID dalam POINT. 0 = tanpa batas
input bool   Chart_Prioritize_Buy_Sell    = true;        // Prioritas tampilan awal: 1 BUY + 1 SELL jika tersedia
input bool   Chart_Sort_By_Nearest_Price  = true;        // Urutkan zona chart dari jarak terdekat harga BID
input color  Buy_Zone_Color               = clrGainsboro; // Warna zona BUY
input color  Sell_Zone_Color              = clrGainsboro; // Warna zona SELL
input color  Zone_Text_Color              = clrBlack;     // Warna tulisan zona
input int    Zone_Text_Size               = 10;           // Ukuran tulisan zona
const bool   Draw_Zones_Behind_Candle     = true;
input bool   Show_Zone_Label              = true;         // Tampilkan label BUY/SELL pada zona
input bool   Show_TP_CL_Hold_Lines        = true;         // Garis bantu TP/CL/Hold khusus zona yang sudah dikirim Telegram
input bool   Show_Trade_Line_Labels       = true;         // Tampilkan tulisan TP/CL/Hold di dekat line
input int    Trade_Line_Label_Offset_Points = 25;         // Cadangan jarak harga. Label utama memakai pixel kanan chart
input int    Trade_Line_Label_X_Bars       = 0;            // Cadangan jika label text chart dipakai
input int    Trade_Line_Label_Font_Size    = 8;            // Ukuran font tulisan TP/CL/Hold
input string Trade_Line_Label_Font         = "Arial Bold"; // Font tulisan TP/CL/Hold
input int    Trade_Line_Label_Right_Pixels = 118;          // Posisi label dari sisi kanan chart
input int    Trade_Line_Label_Y_Pixels     = 6;            // Jarak label di atas/bawah line dalam pixel
input bool   Show_Zone_Boundary_Lines      = true;         // Gambar garis bantu Zona Awal/Zona Akhir untuk zona alert
input color  Zone_Boundary_Line_Color      = clrBlack;     // Warna garis bantu batas zona
input color  TP_Line_Color                = clrLimeGreen; // Warna garis TP
input color  CL_Line_Color                = clrRed;       // Warna garis Cut Loss
input color  Hold_Line_Color              = clrDodgerBlue;// Warna garis Hold
input int    Trade_Line_Width             = 1;            // Ketebalan garis bantu
input bool   Show_Header_Title            = true;         // Tampilkan judul di chart
input string Header_Title_Text            = "Kamar Signal Advisor"; // Judul chart
input color  Header_Title_Color           = clrSteelBlue; // Warna judul
input int    Header_Title_Font_Size       = 20;           // Ukuran judul
input string Header_Title_Font            = "Segoe UI Semibold"; // Font judul
input int    Header_Title_Y_Offset        = 24;           // Jarak judul dari atas
input bool   Show_Candle_Countdown       = true;         // Tampilkan countdown candle berjalan
input color  Candle_Countdown_Color      = clrSteelBlue;  // Warna countdown candle
input int    Candle_Countdown_Font_Size  = 10;           // Ukuran tulisan countdown
input string Candle_Countdown_Font       = "Arial Bold"; // Font countdown
input int    Candle_Countdown_X_Offset_Seconds = 1;      // Jarak countdown di kanan candle dalam detik

string Section_03_Telegram = "===== 03. TELEGRAM =====";
bool   Telegram_ON        = false;   // Aktifkan alert Telegram
string Bot_Token           = "";     // Token bot dari @BotFather, tanpa awalan bot
bool   Send_Update_Reply      = true;   // Kirim update reply singkat ke posting signal awal
bool   Keep_Only_Latest_Update = true;    // Hapus update lama setelah update terbaru pada zona yang sama terkirim
bool   Edit_Original_Message   = true;    // Edit posting signal awal: TP/Hold ✅ Done, Cut Loss ❌ Hit
bool   Retry_Delete_Old_Update = true;    // Coba ulang hapus update lama sampai berhasil
bool   Delete_Old_Update_Async = true;    // Hapus update lama lewat queue agar update baru tidak tertahan
int    Delete_Retry_Seconds = 5;          // Jeda coba ulang hapus update lama, dalam detik
int    Max_Delete_Per_Cycle = 1;          // Maksimal proses hapus per OnTimer/OnTick agar tidak blokir Telegram
int    Update_Message_Delete_Seconds = 30; // Hapus otomatis pesan update setelah detik ini; 0 = tidak auto hapus
const bool   Send_Alert_After_Candle_Close = true;

string Section_03B_Screenshot = "===== 03B. SCREENSHOT =====";
bool   Screenshot_ON = false;              // true = signal dikirim sebagai screenshot + caption format signal
bool   Entry_Touch_Alert_ON = true;        // Kirim update saat harga masuk zona entry
bool   Entry_Touch_Screenshot_ON = false;  // Kirim screenshot saat harga masuk zona entry jika Screenshot_ON=true
bool   Highrisk_Warning_ON = true;         // Alert jika harga hampir masuk zona lalu HIT TP1 sebelum masuk zona
int    Highrisk_Distance_Points = 100;     // Jarak hampir masuk zona dalam POINT
bool   Update_Screenshot_ON = false;       // Kirim screenshot pada update Last Call / TP / Hold / Cut Loss / Highrisk jika Screenshot_ON=true
int    Screenshot_Width = 1280;            // Lebar screenshot chart
int    Screenshot_Height = 720;            // Tinggi screenshot chart
const bool   Send_Text_Signal = true;            // Internal fallback: teks tetap dikirim jika screenshot gagal / Screenshot_ON=false
const bool   Send_Screenshot_With_Signal = true; // Internal: dikontrol oleh Screenshot_ON
const bool   Signal_Photo_With_Full_Caption = true;
const bool   Screenshot_As_Reply_To_Signal = true;
const bool   Screenshot_Use_Caption = true;
const bool   Send_Screenshot_On_Update = true;   // Internal: dikontrol oleh Screenshot_ON && Update_Screenshot_ON
const bool   Update_Screenshot_As_Reply = true;
const bool   Update_Screenshot_Use_Caption = true;
const int    Screenshot_Delay_MS = 1500;
const int    Screenshot_File_Wait_MS = 3000;
const int    Screenshot_Upload_Timeout_MS = 30000;
const int    Screenshot_Retry_Count = 2;
bool   Screenshot_Debug_Log = true;        // Log detail screenshot di tab Experts
const bool   Screenshot_Send_Error_Message = true;
const bool   Screenshot_Keep_File_On_Fail = true;
const bool   Screenshot_Force_Text_Fallback = true;

bool   Send_Buy_Signal              = true;   // Kirim signal BUY
bool   Send_Sell_Signal             = true;   // Kirim signal SELL
ENUM_ZONE_ALERT_FILTER Zone_Filter = All_Active_Zones; // Filter zona yang dikirim
bool   Test_On_Start = true; // Kirim test saat EA dipasang
bool   Send_Zones_On_Start = true; // Kirim SEMUA zona historis yang masih aktif sesuai filter saat EA dipasang
int    Max_Zones_Per_Scan   = 2;      // Maksimal ZONA LAMA aktif/antri saat scan awal. Zona baru setelah EA aktif tetap langsung alert
const int    Max_Active_Alerts       = 0;      // Internal: limit zona lama memakai Max_Zones_Per_Scan
const bool   Prioritize_Buy_And_Sell_Zone = true; // Internal
const bool   Sort_Alert_Zones_By_Nearest_Price = true; // Internal
bool   Use_Distance_Filter = true; // Kirim hanya zona yang jaraknya masih dalam batas pips dari harga BID
int    Max_Distance_Points     = 1000; // Batas jarak maksimal alert dari harga BID dalam POINT. 1000 point = 100 pips. 0 = tanpa batas
const bool   Alert_New_Valid_Zones_Immediately = true; // Internal
const bool   Check_Unsent_Visible_Zones_Every_Scan = true; // Internal
const bool   New_Zone_Alert_Ignore_Active_Slot_Limit = true; // Internal
const int    Release_Alert_Slot_After_TP_Level = 0; // Internal: TP tidak melepas slot; zona tetap dipantau sampai invalid/break
const bool   Release_Alert_Slot_When_Broken = true; // Internal
const bool   Auto_Send_Next_Zone_When_Slot_Free = true; // Internal
const bool   Resend_Zones_When_Timeframe_Changed = true; // Internal
int    Take_Profit_1_Points         = 300;    // Jarak TP 1 dari awal zona dalam point
int    Take_Profit_2_Points         = 500;    // Jarak TP 2 dari awal zona dalam point
int    Take_Profit_3_Points         = 1000;   // Jarak TP 3 dari awal zona dalam point
int    Hold_1_Points                = 2500;   // Jarak Hold 1 dari awal zona dalam point
int    Hold_2_Points                = 5000;   // Jarak Target Lanjutan 2 dari awal zona dalam point
int    Hold_3_Points                = 10000;  // Jarak Target Lanjutan 3 dari awal zona dalam point. 10000 point = 1000 pips jika Points_Per_Pip=10
int    Cut_Loss_Points              = 100;    // Jarak Cut Loss dari akhir zona dalam point
int    Scan_Every_Seconds           = 2;      // Interval scan EA

input string Section_03C_Website = "===== 03C. WEBSITE UPDATE =====";
input bool   Website_Update_ON       = false;  // Aktifkan kirim data Kamar Study ke website
input string Website_API_URL         = "https://kamar-kajian-market.vercel.app/api/kamar-study-update"; // URL API website
input string Website_API_Token       = "";     // Token EA dari Vercel: KAMAR_EA_API_TOKEN
input string Website_Visibility      = "member"; // Pilihan: member atau public
input string Website_Zone_ID_Prefix  = "KM-STUDY"; // Prefix ID zona website
input bool   Website_Send_New_Zone   = true;   // Kirim zona baru ke website
input bool   Website_Send_Progress   = true;   // Kirim entry, target, running, invalidasi ke website
input bool   Website_Debug_Log       = true;   // Tampilkan log response API website
input int    Website_Timeout_MS      = 10000;  // Timeout request website dalam milidetik
input bool   Website_Send_Test_On_Start = false; // TEST: kirim 1 data dummy saat EA start untuk cek koneksi API
input int    Website_Price_Heartbeat_Seconds = 30; // Kirim Harga Saat Ini berkala. 0 = OFF
input int    Website_Fresh_History_Check_Bars = 3000; // Legacy diagnostic; tidak memblokir NEW_ZONE Step24AS
input int    Website_Fresh_Priority_Distance_Pips = 100; // XAUUSD: 100 pips = 10.00 point website untuk prioritas tampil

// Internal website guard: loss/invalidasi tidak dikirim lagi bila zona sudah pernah update profit minimal 20 pips atau HIT TP1.
const int    Website_Invalid_Lock_Min_Pips = 20;

string Section_04_Telegram_Target_1 = "===== 04. CHANNEL 1 SETTING & FORMAT ALERT =====";
bool   Channel_1_Enable             = false;   // Aktifkan kirim ke channel/grup 1
string Channel_1_ID_or_Username     = "";     // Isi @NamaChannel atau -100xxxxxxxxxx
int    Channel_1_Topic_ID           = 0;      // Topic ID forum Telegram. Isi 0 jika tidak memakai topic
string Channel_1_Zone_ID_Prefix     = "KMR-STUDY";
string Channel_1_Entry_Buy_Header   = "🔔 BUY AKTIF - AREA KAJIAN"; // FORMAT: Header alert BUY/Area masuk zona Channel 1
string Channel_1_Entry_Sell_Header  = "🔔 SELL AKTIF - AREA KAJIAN"; // FORMAT: Header alert SELL/Area masuk zona Channel 1
string Channel_1_Entry_Text         = "Harga memasuki area observasi. Data ini hanya untuk bahan kajian market."; // FORMAT: Isi alert harga masuk zona Channel 1
string Channel_1_Update_Header      = "🔔 UPDATE KAJIAN MARKET";
string Channel_1_TP_Header          = "✅ {TARGET} - TERCAPAI";
string Channel_1_Hold_Header        = "✅ {TARGET} - TERCAPAI";
string Channel_1_LastCall_Header    = "✅ UPDATE PERKEMBANGAN {SIGNAL}";
string Channel_1_CutLoss_Header     = "❌ UPDATE INVALIDASI"; // FORMAT: Header update TP/Hold/LastCall/Invalidasi Channel 1
string Channel_1_TP_Text            = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅"; // FORMAT: Status Target/TP Channel 1
string Channel_1_Hold_Text          = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅"; // FORMAT: Status Hold/Area lanjutan Channel 1
string Channel_1_LastCall_Text      = "Perkembangan skenario +{PIPS} Pips dari area terdalam ✅"; // FORMAT: Status Last Call Channel 1
string Channel_1_CutLoss_Text       = "Skenario terinvalidasi - Pergerakan berlawanan {PIPS} Pips ❌"; // FORMAT: Status Invalidasi/CutLoss Channel 1
string Channel_1_Highrisk_Header    = "⚠️ WARNING KAJIAN";
string Channel_1_Highrisk_Text      = "Skenario berubah highrisk karena area target awal tersentuh sebelum area observasi ⚠️";
string Channel_1_Highrisk_Note      = "Gunakan pertimbangan pribadi dan manajemen risiko masing-masing.";
string Channel_1_Result_Profit_Text = "Pergerakan positif {PIPS} Pips ✅"; // FORMAT: Result profit di postingan awal Channel 1
string Channel_1_Result_Loss_Text   = "Invalidasi {PIPS} Pips ❌"; // FORMAT: Result loss di postingan awal Channel 1
string Channel_1_Disclaimer_Text    = "Catatan: Konten ini bersifat edukasi dan observasi market, bukan ajakan transaksi. Keputusan dan risiko sepenuhnya menjadi tanggung jawab masing-masing."; // FORMAT: Disclaimer signal awal Channel 1
string Channel_1_Message_Title      = "📌 KAMAR MARKET STUDY"; // FORMAT: Judul signal awal Channel 1
bool   Channel_1_Use_Time_Filter    = false;  // Aktifkan filter jam kirim channel/grup 1
string Channel_1_Start_Time         = "00:00"; // Jam mulai kirim, format HH:MM, waktu server MT5
string Channel_1_End_Time           = "23:59"; // Jam selesai kirim, format HH:MM, waktu server MT5
bool   Channel_1_Report_Enable    = true;   // Aktifkan rekap untuk channel/grup 1
string Channel_1_Report_Title     = "📊 REKAP KAJIAN PUBLIK";
bool   Channel_1_Daily_Report     = true;    // Kirim rekap harian ke ID channel/grup 1
string Channel_1_Daily_Time_WIB   = "23:59"; // Jam rekap harian WIB channel/grup 1
bool   Channel_1_Weekly_Report    = true;    // Kirim rekap mingguan Sabtu ke ID channel/grup 1
string Channel_1_Weekly_Time_WIB  = "23:59"; // Jam rekap mingguan WIB channel/grup 1
bool   Channel_1_Monthly_Report   = true;    // Kirim rekap bulanan tanggal 1 ke ID channel/grup 1
string Channel_1_Monthly_Time_WIB = "09:00"; // Jam rekap bulanan WIB channel/grup 1

string Section_05_Telegram_Target_2 = "===== 05. CHANNEL 2 SETTING & FORMAT ALERT =====";
bool   Channel_2_Enable             = false;
string Channel_2_ID_or_Username     = "";     // Isi @NamaChannel atau -100xxxxxxxxxx
int    Channel_2_Topic_ID           = 0;      // Topic ID forum Telegram. Isi 0 jika tidak memakai topic
string Channel_2_Zone_ID_Prefix     = "KS-MEMBER";
string Channel_2_Entry_Buy_Header   = "🔔 BUY AKTIF - AREA KAJIAN";
string Channel_2_Entry_Sell_Header  = "🔔 SELL AKTIF - AREA KAJIAN";
string Channel_2_Entry_Text         = "Harga memasuki area observasi. Data ini hanya untuk bahan kajian market.";
string Channel_2_Update_Header      = "🔔 UPDATE KAJIAN MARKET";
string Channel_2_TP_Header          = "✅ {TARGET} - TERCAPAI";
string Channel_2_Hold_Header        = "✅ {TARGET} - TERCAPAI";
string Channel_2_LastCall_Header    = "✅ UPDATE PERKEMBANGAN {SIGNAL}";
string Channel_2_CutLoss_Header     = "❌ UPDATE INVALIDASI";
string Channel_2_TP_Text            = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_2_Hold_Text          = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_2_LastCall_Text      = "Perkembangan skenario +{PIPS} Pips dari area terdalam ✅";
string Channel_2_CutLoss_Text       = "Skenario terinvalidasi - Pergerakan berlawanan {PIPS} Pips ❌";
string Channel_2_Highrisk_Header    = "⚠️ WARNING KAJIAN";
string Channel_2_Highrisk_Text      = "Skenario berubah highrisk karena area target awal tersentuh sebelum area observasi ⚠️";
string Channel_2_Highrisk_Note      = "Gunakan pertimbangan pribadi dan manajemen risiko masing-masing.";
string Channel_2_Result_Profit_Text = "Pergerakan positif {PIPS} Pips ✅";
string Channel_2_Result_Loss_Text   = "Invalidasi {PIPS} Pips ❌";
string Channel_2_Disclaimer_Text    = "Catatan: Konten ini bersifat edukasi dan observasi market, bukan ajakan transaksi. Keputusan dan risiko sepenuhnya menjadi tanggung jawab masing-masing.";
string Channel_2_Message_Title      = "📌 KAMAR MARKET STUDY MEMBERSHIP";
bool   Channel_2_Use_Time_Filter    = false;
string Channel_2_Start_Time         = "00:00";
string Channel_2_End_Time           = "23:59";
bool   Channel_2_Report_Enable    = true;
string Channel_2_Report_Title     = "📊 REKAP KAJIAN MEMBERSHIP";
bool   Channel_2_Daily_Report     = true;    // Kirim rekap harian ke ID channel/grup 2
string Channel_2_Daily_Time_WIB   = "23:59"; // Jam rekap harian WIB channel/grup 2
bool   Channel_2_Weekly_Report    = true;    // Kirim rekap mingguan Sabtu ke ID channel/grup 2
string Channel_2_Weekly_Time_WIB  = "23:59"; // Jam rekap mingguan WIB channel/grup 2
bool   Channel_2_Monthly_Report   = true;    // Kirim rekap bulanan tanggal 1 ke ID channel/grup 2
string Channel_2_Monthly_Time_WIB = "09:00"; // Jam rekap bulanan WIB channel/grup 2

string Section_06_Telegram_Target_3 = "===== 06. CHANNEL 3 SETTING & FORMAT ALERT =====";
bool   Channel_3_Enable             = false;
string Channel_3_ID_or_Username     = "";     // Isi @NamaChannel atau -100xxxxxxxxxx
int    Channel_3_Topic_ID           = 0;      // Topic ID forum Telegram. Isi 0 jika tidak memakai topic
string Channel_3_Zone_ID_Prefix     = "KS-VIP";
string Channel_3_Entry_Buy_Header   = "🔔 BUY AKTIF - AREA KAJIAN";
string Channel_3_Entry_Sell_Header  = "🔔 SELL AKTIF - AREA KAJIAN";
string Channel_3_Entry_Text         = "Harga memasuki area observasi. Data ini hanya untuk bahan kajian market.";
string Channel_3_Update_Header      = "🔔 UPDATE KAJIAN MARKET";
string Channel_3_TP_Header          = "✅ {TARGET} - TERCAPAI";
string Channel_3_Hold_Header        = "✅ {TARGET} - TERCAPAI";
string Channel_3_LastCall_Header    = "✅ UPDATE PERKEMBANGAN {SIGNAL}";
string Channel_3_CutLoss_Header     = "❌ UPDATE INVALIDASI";
string Channel_3_TP_Text            = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_3_Hold_Text          = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_3_LastCall_Text      = "Perkembangan skenario +{PIPS} Pips dari area terdalam ✅";
string Channel_3_CutLoss_Text       = "Skenario terinvalidasi - Pergerakan berlawanan {PIPS} Pips ❌";
string Channel_3_Highrisk_Header    = "⚠️ WARNING KAJIAN";
string Channel_3_Highrisk_Text      = "Skenario berubah highrisk karena area target awal tersentuh sebelum area observasi ⚠️";
string Channel_3_Highrisk_Note      = "Gunakan pertimbangan pribadi dan manajemen risiko masing-masing.";
string Channel_3_Result_Profit_Text = "Pergerakan positif {PIPS} Pips ✅";
string Channel_3_Result_Loss_Text   = "Invalidasi {PIPS} Pips ❌";
string Channel_3_Disclaimer_Text    = "Catatan: Konten ini bersifat edukasi dan observasi market, bukan ajakan transaksi. Keputusan dan risiko sepenuhnya menjadi tanggung jawab masing-masing.";
string Channel_3_Message_Title      = "📌 KAMAR MARKET STUDY VIP";
bool   Channel_3_Use_Time_Filter    = false;
string Channel_3_Start_Time         = "00:00";
string Channel_3_End_Time           = "23:59";
bool   Channel_3_Report_Enable    = true;
string Channel_3_Report_Title     = "📊 REKAP KAJIAN VIP";
bool   Channel_3_Daily_Report     = true;    // Kirim rekap harian ke ID channel/grup 3
string Channel_3_Daily_Time_WIB   = "23:59"; // Jam rekap harian WIB channel/grup 3
bool   Channel_3_Weekly_Report    = true;    // Kirim rekap mingguan Sabtu ke ID channel/grup 3
string Channel_3_Weekly_Time_WIB  = "23:59"; // Jam rekap mingguan WIB channel/grup 3
bool   Channel_3_Monthly_Report   = true;    // Kirim rekap bulanan tanggal 1 ke ID channel/grup 3
string Channel_3_Monthly_Time_WIB = "09:00"; // Jam rekap bulanan WIB channel/grup 3

string Section_07_Telegram_Target_4 = "===== 07. CHANNEL 4 SETTING & FORMAT ALERT =====";
bool   Channel_4_Enable             = false;
string Channel_4_ID_or_Username     = "";     // Isi @NamaChannel atau -100xxxxxxxxxx
int    Channel_4_Topic_ID           = 0;      // Topic ID forum Telegram. Isi 0 jika tidak memakai topic
string Channel_4_Zone_ID_Prefix     = "KS-PREMIUM";
string Channel_4_Entry_Buy_Header   = "🔔 BUY AKTIF - AREA KAJIAN";
string Channel_4_Entry_Sell_Header  = "🔔 SELL AKTIF - AREA KAJIAN";
string Channel_4_Entry_Text         = "Harga memasuki area observasi. Data ini hanya untuk bahan kajian market.";
string Channel_4_Update_Header      = "🔔 UPDATE KAJIAN MARKET";
string Channel_4_TP_Header          = "✅ {TARGET} - TERCAPAI";
string Channel_4_Hold_Header        = "✅ {TARGET} - TERCAPAI";
string Channel_4_LastCall_Header    = "✅ UPDATE PERKEMBANGAN {SIGNAL}";
string Channel_4_CutLoss_Header     = "❌ UPDATE INVALIDASI";
string Channel_4_TP_Text            = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_4_Hold_Text          = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_4_LastCall_Text      = "Perkembangan skenario +{PIPS} Pips dari area terdalam ✅";
string Channel_4_CutLoss_Text       = "Skenario terinvalidasi - Pergerakan berlawanan {PIPS} Pips ❌";
string Channel_4_Highrisk_Header    = "⚠️ WARNING KAJIAN";
string Channel_4_Highrisk_Text      = "Skenario berubah highrisk karena area target awal tersentuh sebelum area observasi ⚠️";
string Channel_4_Highrisk_Note      = "Gunakan pertimbangan pribadi dan manajemen risiko masing-masing.";
string Channel_4_Result_Profit_Text = "Pergerakan positif {PIPS} Pips ✅";
string Channel_4_Result_Loss_Text   = "Invalidasi {PIPS} Pips ❌";
string Channel_4_Disclaimer_Text    = "Catatan: Konten ini bersifat edukasi dan observasi market, bukan ajakan transaksi. Keputusan dan risiko sepenuhnya menjadi tanggung jawab masing-masing.";
string Channel_4_Message_Title      = "📌 KAMAR MARKET STUDY PREMIUM";
bool   Channel_4_Use_Time_Filter    = false;
string Channel_4_Start_Time         = "00:00";
string Channel_4_End_Time           = "23:59";
bool   Channel_4_Report_Enable    = true;
string Channel_4_Report_Title     = "📊 REKAP KAJIAN PREMIUM";
bool   Channel_4_Daily_Report     = true;    // Kirim rekap harian ke ID channel/grup 4
string Channel_4_Daily_Time_WIB   = "23:59"; // Jam rekap harian WIB channel/grup 4
bool   Channel_4_Weekly_Report    = true;    // Kirim rekap mingguan Sabtu ke ID channel/grup 4
string Channel_4_Weekly_Time_WIB  = "23:59"; // Jam rekap mingguan WIB channel/grup 4
bool   Channel_4_Monthly_Report   = true;    // Kirim rekap bulanan tanggal 1 ke ID channel/grup 4
string Channel_4_Monthly_Time_WIB = "09:00"; // Jam rekap bulanan WIB channel/grup 4

string Section_08_Telegram_Target_5 = "===== 08. CHANNEL 5 SETTING & FORMAT ALERT =====";
bool   Channel_5_Enable             = false;
string Channel_5_ID_or_Username     = "";     // Isi @NamaChannel atau -100xxxxxxxxxx
int    Channel_5_Topic_ID           = 0;      // Topic ID forum Telegram. Isi 0 jika tidak memakai topic
string Channel_5_Zone_ID_Prefix     = "KS-PRIVATE";
string Channel_5_Entry_Buy_Header   = "🔔 BUY AKTIF - AREA KAJIAN";
string Channel_5_Entry_Sell_Header  = "🔔 SELL AKTIF - AREA KAJIAN";
string Channel_5_Entry_Text         = "Harga memasuki area observasi. Data ini hanya untuk bahan kajian market.";
string Channel_5_Update_Header      = "🔔 UPDATE KAJIAN MARKET";
string Channel_5_TP_Header          = "✅ {TARGET} - TERCAPAI";
string Channel_5_Hold_Header        = "✅ {TARGET} - TERCAPAI";
string Channel_5_LastCall_Header    = "✅ UPDATE PERKEMBANGAN {SIGNAL}";
string Channel_5_CutLoss_Header     = "❌ UPDATE INVALIDASI";
string Channel_5_TP_Text            = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_5_Hold_Text          = "{TARGET} tercapai - Pergerakan {PIPS} Pips ✅";
string Channel_5_LastCall_Text      = "Perkembangan skenario +{PIPS} Pips dari area terdalam ✅";
string Channel_5_CutLoss_Text       = "Skenario terinvalidasi - Pergerakan berlawanan {PIPS} Pips ❌";
string Channel_5_Highrisk_Header    = "⚠️ WARNING KAJIAN";
string Channel_5_Highrisk_Text      = "Skenario berubah highrisk karena area target awal tersentuh sebelum area observasi ⚠️";
string Channel_5_Highrisk_Note      = "Gunakan pertimbangan pribadi dan manajemen risiko masing-masing.";
string Channel_5_Result_Profit_Text = "Pergerakan positif {PIPS} Pips ✅";
string Channel_5_Result_Loss_Text   = "Invalidasi {PIPS} Pips ❌";
string Channel_5_Disclaimer_Text    = "Catatan: Konten ini bersifat edukasi dan observasi market, bukan ajakan transaksi. Keputusan dan risiko sepenuhnya menjadi tanggung jawab masing-masing.";
string Channel_5_Message_Title      = "📌 KAMAR MARKET STUDY PRIVATE";
bool   Channel_5_Use_Time_Filter    = false;
string Channel_5_Start_Time         = "00:00";
string Channel_5_End_Time           = "23:59";
bool   Channel_5_Report_Enable    = true;
string Channel_5_Report_Title     = "📊 REKAP KAJIAN PRIVATE";
bool   Channel_5_Daily_Report     = true;    // Kirim rekap harian ke ID channel/grup 5
string Channel_5_Daily_Time_WIB   = "23:59"; // Jam rekap harian WIB channel/grup 5
bool   Channel_5_Weekly_Report    = true;    // Kirim rekap mingguan Sabtu ke ID channel/grup 5
string Channel_5_Weekly_Time_WIB  = "23:59"; // Jam rekap mingguan WIB channel/grup 5
bool   Channel_5_Monthly_Report   = true;    // Kirim rekap bulanan tanggal 1 ke ID channel/grup 5
string Channel_5_Monthly_Time_WIB = "09:00"; // Jam rekap bulanan WIB channel/grup 5

input string Section_09_Update_Status = "===== 09. UPDATE =====";
// v1.83 NOTE: update status dikunci realtime. Screenshot/visual tidak boleh memicu TP/LastCall dari OHLC/history.
// Syarat update: signal terkirim -> ada tick/BID masuk zona setelah alert -> baru LastCall/TP/Hold/CL diproses.
input bool   Update_ON     = true;   // Aktifkan update status zona yang sudah dikirim
input int    Points_Per_Pip        = 10;     // Konversi tampilan pip: 10 point = 1 pip
input bool   Update_TP            = true;   // Update saat TP tersentuh
input bool   Update_Loss      = true;   // Update saat candle close melewati Cut Loss
input bool   Update_LastCall_Profit = true;  // Update profit dari Last Call sebelum TP1
input int    LastCall_Profit_Points = 300;   // Minimal update Last Call pertama dan update result posting awal
input int    LastCall_Milestone_Start_Pips = 150; // Alert Last Call berikutnya mulai dari pips ini
input int    LastCall_Milestone_Step_Pips  = 50;  // Kelipatan alert Last Call berikutnya setelah milestone
input bool   Update_RR_1_1_Profit   = false; // Alert jika profit realtime sudah RR 1:1 dari ukuran zona
const bool   Update_Profit         = true;   // Internal: dipakai untuk Last Call profit only
const int    Profit_Update_Points  = 300;    // Internal fallback; memakai LastCall_Profit_Points
const bool   Suppress_Loss_After_Any_TP = true; // Internal: setelah TP1/TP2/TP3, Loss/Cut Loss tidak dikirim lagi
const bool   Suppress_Loss_After_LastCall_Update = true; // Internal: setelah update Last Call profit, Loss/Cut Loss tidak dikirim lagi
const bool   Use_Last_Call_Running_Text    = true;   // Internal
const bool   Detect_Entry_Touch_From_History = false; // Internal v1.83: update tidak boleh dipicu OHLC/history; wajib touch realtime/tick setelah alert
const bool   Detect_TP_Hit_From_History    = false;  // Internal v1.83: TP tidak dipicu OHLC/history; hanya BID realtime atau tick sequence setelah alert
const bool   Detect_Running_Profit_From_History = false; // Internal v1.83: Last Call tidak dipicu OHLC/history
const bool   Force_Running_Update_From_Last_Call_History = false; // Internal v1.83: matikan fallback history agar tidak false update saat screenshot aktif
const ENUM_SAME_CANDLE_UPDATE_MODE Same_Candle_Update_Mode = Tick_Confirmed_Only; // Internal
const bool   Use_Tick_Sequence_For_Fast_Update = false; // Internal v1.86: TP/LastCall hanya dari BID realtime saat ini; tick history dimatikan agar tidak false HIT TP
const int    Tick_Sequence_Lookback_Minutes = 180; // Internal
const bool   Require_Profit_After_Zone_Touch = true; // Internal
input bool   Debug_Update_Status_Log = false; // Log detail update zona di tab Experts
const bool   Strict_Update_After_Alert_Touch = true;  // Internal v1.83: update wajib setelah touch realtime/tick setelah alert
const bool   Continue_Update_After_Reentry_To_Zone = true; // Internal
input string RR_1_1_Status_Text          = "✅ Perkembangan Skenario RR 1:1"; // Teks update RR 1:1

string Section_10_Report_Note = "===== 10. REKAP KAJIAN =====";
bool   Report_ON              = false;    // Aktifkan rekap otomatis
bool   Report_Use_WIB_Time        = true;    // Semua jam rekap/filter dibaca sebagai WIB/GMT+7
int    Server_UTC_Offset          = 0;       // Offset UTC server broker. Contoh GMT+2 isi 2
int    WIB_UTC_Offset             = 7;       // WIB = GMT+7
bool   Restore_Report_Data = true;        // Baca ulang data rekap setelah MT5/VPS restart
bool   Restore_Active_Lifecycle = false;    // Default false: tidak melanjutkan update signal lama setelah restart
bool   Show_Open_Signals_In_Report = false; // Tampilkan Open di rekap. Default false
bool   Report_Per_Timeframe = true;         // Rekap berdasarkan timeframe EA yang terpasang
string Report_Title_Daily   = "REKAP KAJIAN HARIAN";   // Judul periode rekap harian
string Report_Title_Weekly  = "REKAP KAJIAN MINGGUAN"; // Judul periode rekap mingguan
string Report_Title_Monthly = "REKAP KAJIAN BULANAN";  // Judul periode rekap bulanan
string Report_Label_Profit = "Target Tercapai";   // Label rekap pengganti Running Profit
string Report_Label_Loss   = "Invalidasi";     // Label rekap pengganti Cut Loss
string Report_Label_Winrate = "Winrate";       // Label winrate pada rekap
string Report_Profit_Symbol = "✅";       // Simbol profit pada rekap
string Report_Loss_Symbol   = "❌";       // Simbol loss pada rekap

string Section_11_MT5_Push = "===== 11. MT5 PUSH OPTIONAL =====";
bool   Enable_MT5_Push_Notification = false;  // Kirim juga ke aplikasi MT5 mobile

#define KNS_EA_PREFIX "KNS_EA_ZONE_"

struct ZoneState
{
   int      dir;          // 1 = buy zone, -1 = sell zone
   datetime bornTime;
   datetime leftTime;
   datetime rightTime;
   double   top;
   double   bottom;
   double   originalTop;
   double   originalBottom;
   bool     stillActive;
   bool     wasTouched;  // false = Fresh, true = Remaining
};

ZoneState g_zones[];

string g_knownZoneBaseKeys[];
bool   g_knownZonesInitialized = false;

// v1.42 Final: snapshot zona lama saat EA mulai.
// Zona lama mengikuti limit/antrean; zona baru setelah snapshot langsung alert.
string g_initialZoneBaseKeys[];
bool   g_initialSnapshotReady = false;

// Website integration Step 24AH: anti-double khusus website.
// Dipisah dari Telegram agar website tetap bisa berjalan meskipun Telegram OFF.
string g_websiteSentBaseKeys[];
datetime g_websiteLastHeartbeatTime = 0;

struct SentZoneMessage
{
   string zoneKey;
   string chatId;
   string zoneId;
   int    messageId;
   bool   isPhotoMessage;
   string messageTitle;
   datetime sentTime;
};

struct LatestUpdateMessage
{
   string baseKey;
   string chatId;
   int    messageId;
};

struct PendingDeleteMessage
{
   string chatIdRaw;
   int    topicId;
   int    messageId;
   int    attempts;
   datetime dueTime;
};

SentZoneMessage g_sentZoneMessages[];
LatestUpdateMessage g_latestUpdateMessages[];
PendingDeleteMessage g_pendingDeleteMessages[];
string g_sentReportKeys[];

struct ZoneLifecycleState
{
   string baseKey;
   bool   entryActive;
   double lastCallPrice;
   int    lastRunningStep;
   int    postTp3RunningStep;
   bool   tp1Sent;
   bool   tp2Sent;
   bool   tp3Sent;
   bool   hold1Sent;
   bool   hold2Sent;
   bool   hold3Sent;
   bool   rrOneToOneSent;
   bool   cutLossSent;
   bool   slotReleased;
   bool   tickTouchConfirmed;
   datetime tickTouchBarTime;
   datetime touchConfirmTime;
   datetime alertStartTime;
   ulong  alertStartMsc;
   bool   requireNewTouchAfterAlert;
   bool   touchedAfterAlert;
   bool   entryTouchAlertSent;
   bool   highriskNearSeen;
   bool   highriskWarningSent;
};

ZoneLifecycleState g_zoneLifecycle[];
string    g_sentAlertKeys[];

struct SignalReportEntry
{
   string baseKey;
   string chatId;
   datetime sentTime;
   int dir;
   string pair;
   string timeframe;
   int bestPips;
   int bestRank; // 0=open, 1=profit/running, 2=TP1, 3=TP2, 4=TP3, -1=loss
   bool closedLoss;
};

SignalReportEntry g_reportEntries[];
int g_lastScreenshotMessageId = 0;
int g_lastDailyReportKey = 0;   // legacy, tidak dipakai untuk report channel individual
int g_lastWeeklyReportKey = 0;  // legacy
int g_lastMonthlyReportKey = 0; // legacy

int g_ch1_lastDailyReportKey=0, g_ch1_lastWeeklyReportKey=0, g_ch1_lastMonthlyReportKey=0;
int g_ch2_lastDailyReportKey=0, g_ch2_lastWeeklyReportKey=0, g_ch2_lastMonthlyReportKey=0;
int g_ch3_lastDailyReportKey=0, g_ch3_lastWeeklyReportKey=0, g_ch3_lastMonthlyReportKey=0;
int g_ch4_lastDailyReportKey=0, g_ch4_lastWeeklyReportKey=0, g_ch4_lastMonthlyReportKey=0;
int g_ch5_lastDailyReportKey=0, g_ch5_lastWeeklyReportKey=0, g_ch5_lastMonthlyReportKey=0;
bool      g_startTestSent = false;
bool      g_startAllZonesSent = false;
datetime  g_lastProcessedBarTime = 0;
int       g_lastKnownPeriod = 0;
string    g_lastKnownSymbol = "";
int       g_lastKnownFilter = -1;
int       g_lastKnownChartFilter = -1;
datetime  g_lastDrawTime = 0;
double    g_lastDrawPrice = 0.0;

// Function prototypes
string ZoneMessageText(const ZoneState &z,const string messageTitle,const string zoneId);
string ZoneScreenshotCaption(const ZoneState &z,const string messageTitle,const string zoneId);
bool SendZoneToAllTargets(const ZoneState &z,const string alertType);
void DrawTradeLinesForSingleZone(const ZoneState &z);
void SendTestMessageToAllTargets();
int ExtractPipsFromStatus(const string statusText);
bool DeleteTelegramMessage(const string chatId,const int messageId);
void ProcessPendingDeletes();
void ProcessZoneLifecycleUpdates(const datetime &time[],const double &high[],const double &low[],const double &close[]);
void CheckCutLossByClosedCandle(const ZoneState &z,const int barIndex,const int rates_total,const double closePrice);
void ForceCutLossOnInvalid(const ZoneState &z,const double closePrice,const string reason);
void SendNextEligibleZonesByAlertSlots(const string reason);
double ZoneDistanceFromCurrentPrice(const ZoneState &z);
int WebsiteZoneDistancePips(const ZoneState &z);
double WebsiteZoneDistancePointValue(const ZoneState &z);
bool WebsiteZoneWithinFreshPriorityDistance(const ZoneState &z);
int BuildPrioritizedEligibleZoneIndexes(int &indexes[]);
bool WebsiteZoneAlreadySent(const string baseKey);
void MarkWebsiteZoneSent(const string baseKey);
bool SendWebsiteZoneNew(const ZoneState &z,const string baseKey);
bool SendWebsiteZoneUpdate(const ZoneState &z,const string baseKey,const string statusText);
bool WebsiteSendConnectivityTest();
bool WebsiteZoneHasHistoricalTouch(const ZoneState &z);
bool WebsiteFreshCandidateAllowed(const ZoneState &z,const string baseKey);
void WebsiteSendPriceHeartbeatIfDue();


//====================================================================
// BASIC HELPERS
//====================================================================
bool StartsWith(const string text,const string prefix)
{
   return(StringFind(text,prefix)==0);
}

void DeleteAllOwnObjects()
{
   int total = ObjectsTotal(0,-1,-1);
   for(int i=total-1; i>=0; i--)
   {
      string name = ObjectName(0,i,-1,-1);
      if(StartsWith(name,KNS_EA_PREFIX))
         ObjectDelete(0,name);
   }
}

void DeleteZoneVisualObjectsOnly()
{
   int total = ObjectsTotal(0,-1,-1);
   for(int i=total-1; i>=0; i--)
   {
      string name = ObjectName(0,i,-1,-1);
      if(StartsWith(name,KNS_EA_PREFIX + "RECT_") || StartsWith(name,KNS_EA_PREFIX + "TEXT_"))
         ObjectDelete(0,name);
   }
}

double BodyHigh(const double openPrice,const double closePrice)
{
   return(MathMax(openPrice,closePrice));
}

double BodyLow(const double openPrice,const double closePrice)
{
   return(MathMin(openPrice,closePrice));
}

bool IsBull(const double openPrice,const double closePrice)
{
   return(closePrice > openPrice);
}

bool IsBear(const double openPrice,const double closePrice)
{
   return(closePrice < openPrice);
}

bool IsDoji(const double openPrice,const double closePrice)
{
   return(closePrice == openPrice);
}

bool IsRestVsPrev(const int i,const double &open[],const double &high[],const double &low[],const double &close[])
{
   if(i<=0)
      return(false);

   double bodyHigh = BodyHigh(open[i],close[i]);
   double bodyLow  = BodyLow(open[i],close[i]);
   return(bodyHigh <= high[i-1] && bodyLow >= low[i-1]);
}

string TimeframeToText(const ENUM_TIMEFRAMES tf)
{
   string text = EnumToString(tf);
   StringReplace(text,"PERIOD_","");
   return(text);
}

string UrlEncodeUtf8(const string text)
{
   char bytes[];
   StringToCharArray(text,bytes,0,WHOLE_ARRAY,CP_UTF8);

   string encoded = "";
   int total = ArraySize(bytes);

   for(int i=0; i<total; i++)
   {
      int c = (int)bytes[i];
      if(c < 0)
         c += 256;
      if(c == 0)
         break;

      bool safe = ((c>='A' && c<='Z') ||
                   (c>='a' && c<='z') ||
                   (c>='0' && c<='9') ||
                   c=='-' || c=='_' || c=='.' || c=='~');

      if(safe)
         encoded += CharToString((uchar)c);
      else if(c == ' ')
         encoded += "+";
      else
         encoded += "%" + StringFormat("%02X",c);
   }

   return(encoded);
}


string TrimText(string text)
{
   StringTrimLeft(text);
   StringTrimRight(text);
   return(text);
}

string ExtractChannelCode(string messageTitle)
{
   string t = messageTitle;
   StringReplace(t,"📌","");
   StringReplace(t,"KAMAR SIGNAL","");
   StringReplace(t,"Kamar Signal","");
   StringReplace(t,"kamar signal","");
   t = TrimText(t);

   if(t == "")
      t = "GENERAL";

   string parts[];
   int n = StringSplit(t,' ',parts);
   if(n > 0)
      t = parts[n-1];

   StringReplace(t,"/","-");
   StringReplace(t,"\\","-");
   StringReplace(t,"|","-");
   StringReplace(t,":","-");
   StringToUpper(t);
   return(t);
}

string ZoneSignalText(const ZoneState &z)
{
   return(z.dir == 1 ? "BUY" : "SELL");
}

string ZoneSignalTextId(const ZoneState &z)
{
   return(z.dir == 1 ? "Buy" : "Sell");
}

double ZoneOriginalTop(const ZoneState &z)
{
   if(z.originalTop != 0.0 || z.originalBottom != 0.0)
      return(z.originalTop);
   return(z.top);
}

double ZoneOriginalBottom(const ZoneState &z)
{
   if(z.originalTop != 0.0 || z.originalBottom != 0.0)
      return(z.originalBottom);
   return(z.bottom);
}

string ZoneBaseKey(const ZoneState &z)
{
   // Key dibuat stabil dan unik per zona. Harga original wajib ikut agar dua zona yang lahir pada candle sama tidak tabrakan.
   double ot = NormalizeDouble(ZoneOriginalTop(z),_Digits);
   double ob = NormalizeDouble(ZoneOriginalBottom(z),_Digits);
   return(_Symbol + "|" + TimeframeToText(_Period) + "|" + ZoneSignalText(z) + "|" +
          IntegerToString((int)z.bornTime) + "|" + DoubleToString(ot,_Digits) + "|" + DoubleToString(ob,_Digits));
}

string ZoneSequenceGlobalName(const string channelCode)
{
   return("KNS_SEQ_" + _Symbol + "_" + TimeframeToText(_Period) + "_" + channelCode);
}

string SafeZonePrefix(string prefix,const string fallbackTitle)
{
   string p = TrimText(prefix);
   if(p == "")
      p = "KS-" + ExtractChannelCode(fallbackTitle);
   StringReplace(p,"/","-");
   StringReplace(p,"\\","-");
   StringReplace(p,"|","-");
   StringReplace(p,":","-");
   return(p);
}

string BuildZoneId(const ZoneState &z,const string messageTitle,const string zonePrefix="")
{
   string prefix = SafeZonePrefix(zonePrefix,messageTitle);
   string gvName = ZoneSequenceGlobalName(prefix);

   double currentSeq = 0.0;
   if(GlobalVariableCheck(gvName))
      currentSeq = GlobalVariableGet(gvName);

   int nextSeq = (int)currentSeq + 1;
   GlobalVariableSet(gvName,nextSeq);

   return(prefix + "/" + ZoneSignalTextId(z) + "/" + TimeframeToText(_Period) + "-" + StringFormat("%03d",nextSeq));
}

string ApplyFormatTokens(string text,const string target,const int pips)
{
   StringReplace(text,"{TARGET}",target);
   StringReplace(text,"{PIPS}",IntegerToString(pips));
   StringReplace(text,"{TF}",TimeframeToText(_Period));
   StringReplace(text,"{PAIR}",_Symbol);
   return(text);
}

string TargetKeyFromParts(const string chatId,const int topicId)
{
   return(TelegramTargetKey(chatId,topicId));
}

string ChannelEntryBuyHeader(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Entry_Buy_Header);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Entry_Buy_Header);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Entry_Buy_Header);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Entry_Buy_Header);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Entry_Buy_Header);
   return("🔔 BUY AKTIF - AREA KAJIAN");
}

string ChannelEntrySellHeader(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Entry_Sell_Header);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Entry_Sell_Header);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Entry_Sell_Header);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Entry_Sell_Header);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Entry_Sell_Header);
   return("🔔 SELL AKTIF - AREA KAJIAN");
}

string ChannelEntryText(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Entry_Text);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Entry_Text);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Entry_Text);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Entry_Text);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Entry_Text);
   return("Harga memasuki area observasi. Data ini hanya untuk bahan kajian market.");
}

string ChannelUpdateHeader(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Update_Header);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Update_Header);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Update_Header);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Update_Header);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Update_Header);
   return("🔔 UPDATE KAJIAN MARKET");
}

string ChannelTypedHeaderTemplate(const string targetKey,const string kind)
{
   if(kind=="TP")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_TP_Header);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_TP_Header);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_TP_Header);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_TP_Header);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_TP_Header);
      return("✅ {TARGET} - TERCAPAI");
   }
   if(kind=="HOLD")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Hold_Header);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Hold_Header);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Hold_Header);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Hold_Header);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Hold_Header);
      return("✅ {TARGET} - TERCAPAI");
   }
   if(kind=="LC")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_LastCall_Header);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_LastCall_Header);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_LastCall_Header);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_LastCall_Header);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_LastCall_Header);
      return("✅ UPDATE PERKEMBANGAN {SIGNAL}");
   }
   if(kind=="CL")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_CutLoss_Header);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_CutLoss_Header);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_CutLoss_Header);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_CutLoss_Header);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_CutLoss_Header);
      return("❌ UPDATE INVALIDASI");
   }
   return(ChannelUpdateHeader(targetKey));
}

string ApplyHeaderTokens(string text,const ZoneState &z,const string target)
{
   StringReplace(text,"{TARGET}",target);
   StringReplace(text,"{SIGNAL}",ZoneSignalText(z));
   StringReplace(text,"{TF}",TimeframeToText(_Period));
   StringReplace(text,"{PAIR}",_Symbol);
   return(text);
}

string HeaderForStatusForTarget(const string targetKey,const string statusText,const ZoneState &z)
{
   if(StringFind(statusText,"HIT TP1")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"TP"),z,"TARGET KAJIAN 1"));
   if(StringFind(statusText,"HIT TP2")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"TP"),z,"TARGET KAJIAN 2"));
   if(StringFind(statusText,"HIT TP3")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"TP"),z,"TARGET KAJIAN 3"));
   if(StringFind(statusText,"Hold 1")>=0 || StringFind(statusText,"HOLD 1")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"HOLD"),z,"TARGET LANJUTAN 1"));
   if(StringFind(statusText,"Hold 2")>=0 || StringFind(statusText,"HOLD 2")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"HOLD"),z,"TARGET LANJUTAN 2"));
   if(StringFind(statusText,"Hold 3")>=0 || StringFind(statusText,"HOLD 3")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"HOLD"),z,"TARGET LANJUTAN 3"));
   if(StringFind(statusText,"Cut Loss")>=0 || StringFind(statusText,"CUT LOSS")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"CL"),z,"Invalidasi"));
   if(StringFind(statusText,"Profit")>=0 || StringFind(statusText,"Running Profit")>=0) return(ApplyHeaderTokens(ChannelTypedHeaderTemplate(targetKey,"LC"),z,"Perkembangan") + " - " + TimeframeToText(_Period));
   return(ChannelUpdateHeader(targetKey));
}

string ChannelHighriskHeader(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Highrisk_Header);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Highrisk_Header);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Highrisk_Header);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Highrisk_Header);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Highrisk_Header);
   return("⚠️ WARNING KAJIAN");
}

string ChannelHighriskText(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Highrisk_Text);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Highrisk_Text);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Highrisk_Text);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Highrisk_Text);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Highrisk_Text);
   return("Skenario berubah highrisk karena area target awal tersentuh sebelum area observasi ⚠️");
}

string ChannelHighriskNote(const string targetKey)
{
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Highrisk_Note);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Highrisk_Note);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Highrisk_Note);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Highrisk_Note);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Highrisk_Note);
   return("Gunakan pertimbangan pribadi dan manajemen risiko masing-masing.");
}

string ChannelStatusTemplate(const string targetKey,const string kind)
{
   if(kind=="TP")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_TP_Text);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_TP_Text);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_TP_Text);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_TP_Text);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_TP_Text);
      return("{TARGET} tercapai - Pergerakan {PIPS} Pips ✅");
   }
   if(kind=="HOLD")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Hold_Text);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Hold_Text);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Hold_Text);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Hold_Text);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Hold_Text);
      return("{TARGET} tercapai - Pergerakan {PIPS} Pips ✅");
   }
   if(kind=="LC")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_LastCall_Text);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_LastCall_Text);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_LastCall_Text);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_LastCall_Text);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_LastCall_Text);
      return("Perkembangan skenario +{PIPS} Pips dari area terdalam ✅");
   }
   if(kind=="CL")
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_CutLoss_Text);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_CutLoss_Text);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_CutLoss_Text);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_CutLoss_Text);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_CutLoss_Text);
      return("Skenario terinvalidasi - Pergerakan berlawanan {PIPS} Pips ❌");
   }
   return("{TARGET} - {PIPS} Pips");
}

string ChannelResultTemplate(const string targetKey,const bool profit)
{
   if(profit)
   {
      if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Result_Profit_Text);
      if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Result_Profit_Text);
      if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Result_Profit_Text);
      if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Result_Profit_Text);
      if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Result_Profit_Text);
      return("Pergerakan +{PIPS} Pips ✅");
   }
   if(targetKey==TargetKeyFromParts(Channel_1_ID_or_Username,Channel_1_Topic_ID)) return(Channel_1_Result_Loss_Text);
   if(targetKey==TargetKeyFromParts(Channel_2_ID_or_Username,Channel_2_Topic_ID)) return(Channel_2_Result_Loss_Text);
   if(targetKey==TargetKeyFromParts(Channel_3_ID_or_Username,Channel_3_Topic_ID)) return(Channel_3_Result_Loss_Text);
   if(targetKey==TargetKeyFromParts(Channel_4_ID_or_Username,Channel_4_Topic_ID)) return(Channel_4_Result_Loss_Text);
   if(targetKey==TargetKeyFromParts(Channel_5_ID_or_Username,Channel_5_Topic_ID)) return(Channel_5_Result_Loss_Text);
   return("Invalidasi {PIPS} Pips ❌");
}

string ChannelDisclaimerTextByTitle(const string messageTitle)
{
   if(messageTitle==Channel_1_Message_Title) return(Channel_1_Disclaimer_Text);
   if(messageTitle==Channel_2_Message_Title) return(Channel_2_Disclaimer_Text);
   if(messageTitle==Channel_3_Message_Title) return(Channel_3_Disclaimer_Text);
   if(messageTitle==Channel_4_Message_Title) return(Channel_4_Disclaimer_Text);
   if(messageTitle==Channel_5_Message_Title) return(Channel_5_Disclaimer_Text);
   return("Catatan: Konten ini bersifat edukasi dan observasi market, bukan ajakan transaksi. Keputusan dan risiko sepenuhnya menjadi tanggung jawab masing-masing.");
}

string FormatDisplayStatusForTarget(const string targetKey,const string statusText)
{
   int pips = ExtractPipsFromStatus(statusText);
   if(StringFind(statusText,"HIT TP1")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"TP"),"Target Kajian 1",pips));
   if(StringFind(statusText,"HIT TP2")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"TP"),"Target Kajian 2",pips));
   if(StringFind(statusText,"HIT TP3")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"TP"),"Target Kajian 3",pips));
   if(StringFind(statusText,"Hold 1")>=0 || StringFind(statusText,"HOLD 1")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"HOLD"),"Target Lanjutan 1",pips));
   if(StringFind(statusText,"Hold 2")>=0 || StringFind(statusText,"HOLD 2")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"HOLD"),"Target Lanjutan 2",pips));
   if(StringFind(statusText,"Hold 3")>=0 || StringFind(statusText,"HOLD 3")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"HOLD"),"Target Lanjutan 3",pips));
   if(StringFind(statusText,"Cut Loss")>=0 || StringFind(statusText,"CUT LOSS")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"CL"),"Invalidasi",pips));
   if(StringFind(statusText,"Profit")>=0 || StringFind(statusText,"Running Profit")>=0) return(ApplyFormatTokens(ChannelStatusTemplate(targetKey,"LC"),"Perkembangan",pips));
   return(CleanStatusForShortReply(statusText));
}

int ExtractTelegramMessageId(const string responseText)
{
   string key = "\"message_id\":";
   int pos = StringFind(responseText,key);
   if(pos < 0)
      return(0);

   pos += StringLen(key);
   string num = "";
   for(int i=pos; i<StringLen(responseText); i++)
   {
      ushort ch = StringGetCharacter(responseText,i);
      if(ch >= '0' && ch <= '9')
         num += StringSubstr(responseText,i,1);
      else
         break;
   }

   if(num == "")
      return(0);
   return((int)StringToInteger(num));
}

string TelegramTargetKey(const string chatId,const int topicId)
{
   if(topicId > 0)
      return(chatId + "#topic=" + IntegerToString(topicId));
   return(chatId);
}

void StoreSentZoneMessage(const string zoneKey,const string chatId,const string zoneId,const int messageId,const bool isPhotoMessage=false,const string messageTitle="")
{
   if(messageId <= 0)
      return;

   for(int i=0; i<ArraySize(g_sentZoneMessages); i++)
   {
      if(g_sentZoneMessages[i].zoneKey == zoneKey && g_sentZoneMessages[i].chatId == chatId)
      {
         g_sentZoneMessages[i].zoneId = zoneId;
         g_sentZoneMessages[i].messageId = messageId;
         g_sentZoneMessages[i].isPhotoMessage = isPhotoMessage;
         g_sentZoneMessages[i].messageTitle = messageTitle;
         if(g_sentZoneMessages[i].sentTime == 0)
            g_sentZoneMessages[i].sentTime = TimeCurrent();
         return;
      }
   }

   int n = ArraySize(g_sentZoneMessages);
   ArrayResize(g_sentZoneMessages,n+1);
   g_sentZoneMessages[n].zoneKey = zoneKey;
   g_sentZoneMessages[n].chatId = chatId;
   g_sentZoneMessages[n].zoneId = zoneId;
   g_sentZoneMessages[n].messageId = messageId;
   g_sentZoneMessages[n].isPhotoMessage = isPhotoMessage;
   g_sentZoneMessages[n].messageTitle = messageTitle;
   g_sentZoneMessages[n].sentTime = TimeCurrent();
}

int FindSentZoneMessageId(const string zoneKey,const string chatId)
{
   for(int i=0; i<ArraySize(g_sentZoneMessages); i++)
   {
      if(g_sentZoneMessages[i].zoneKey == zoneKey && g_sentZoneMessages[i].chatId == chatId)
         return(g_sentZoneMessages[i].messageId);
   }
   return(0);
}

int FindSentZoneMessageIndexByBaseKey(const string baseKey,const string chatId)
{
   string legacyPrefix = baseKey + "|";
   for(int i=0; i<ArraySize(g_sentZoneMessages); i++)
   {
      if(g_sentZoneMessages[i].chatId != chatId)
         continue;

      // v1.20 menyimpan key utama sebagai baseKey saja agar tidak ada duplicate
      // antara NEW_ZONE, SCAN, atau BECAME_REMAINING pada zona yang sama.
      if(g_sentZoneMessages[i].zoneKey == baseKey)
         return(i);

      // Kompatibilitas untuk data lama yang masih memakai baseKey|alertType.
      if(StringFind(g_sentZoneMessages[i].zoneKey,legacyPrefix) == 0)
         return(i);
   }
   return(-1);
}

bool ZoneAlreadySentToTarget(const string baseKey,const string chatId)
{
   return(FindSentZoneMessageIndexByBaseKey(baseKey,chatId) >= 0);
}


int FindLatestUpdateIndex(const string baseKey,const string targetKey)
{
   for(int i=0; i<ArraySize(g_latestUpdateMessages); i++)
      if(g_latestUpdateMessages[i].baseKey==baseKey && g_latestUpdateMessages[i].chatId==targetKey)
         return(i);
   return(-1);
}

void StoreLatestUpdateMessage(const string baseKey,const string targetKey,const int messageId)
{
   if(messageId <= 0) return;
   int idx = FindLatestUpdateIndex(baseKey,targetKey);
   if(idx >= 0)
   {
      g_latestUpdateMessages[idx].messageId = messageId;
      return;
   }
   int n = ArraySize(g_latestUpdateMessages);
   ArrayResize(g_latestUpdateMessages,n+1);
   g_latestUpdateMessages[n].baseKey = baseKey;
   g_latestUpdateMessages[n].chatId = targetKey;
   g_latestUpdateMessages[n].messageId = messageId;
}

void AddPendingDelete(const string chatIdRaw,const int topicId,const int messageId)
{
   if(messageId <= 0) return;
   for(int i=0; i<ArraySize(g_pendingDeleteMessages); i++)
      if(g_pendingDeleteMessages[i].chatIdRaw==chatIdRaw && g_pendingDeleteMessages[i].topicId==topicId && g_pendingDeleteMessages[i].messageId==messageId)
         return;
   int n = ArraySize(g_pendingDeleteMessages);
   ArrayResize(g_pendingDeleteMessages,n+1);
   g_pendingDeleteMessages[n].chatIdRaw = chatIdRaw;
   g_pendingDeleteMessages[n].topicId = topicId;
   g_pendingDeleteMessages[n].messageId = messageId;
   g_pendingDeleteMessages[n].attempts = 0;
   g_pendingDeleteMessages[n].dueTime = 0;
}

void AddPendingDeleteDelayed(const string chatIdRaw,const int topicId,const int messageId,const int delaySeconds)
{
   if(messageId <= 0) return;
   for(int i=0; i<ArraySize(g_pendingDeleteMessages); i++)
   {
      if(g_pendingDeleteMessages[i].chatIdRaw==chatIdRaw && g_pendingDeleteMessages[i].topicId==topicId && g_pendingDeleteMessages[i].messageId==messageId)
      {
         datetime d = TimeCurrent() + delaySeconds;
         if(g_pendingDeleteMessages[i].dueTime==0 || g_pendingDeleteMessages[i].dueTime>d)
            g_pendingDeleteMessages[i].dueTime=d;
         return;
      }
   }
   int n = ArraySize(g_pendingDeleteMessages);
   ArrayResize(g_pendingDeleteMessages,n+1);
   g_pendingDeleteMessages[n].chatIdRaw = chatIdRaw;
   g_pendingDeleteMessages[n].topicId = topicId;
   g_pendingDeleteMessages[n].messageId = messageId;
   g_pendingDeleteMessages[n].attempts = 0;
   g_pendingDeleteMessages[n].dueTime = TimeCurrent() + delaySeconds;
}

bool ReportAlreadySent(const string key)
{
   for(int i=0; i<ArraySize(g_sentReportKeys); i++)
      if(g_sentReportKeys[i] == key)
         return(true);
   return(false);
}

void SaveSentReportKeys();
void SaveReportData();

void MarkReportSent(const string key)
{
   if(ReportAlreadySent(key)) return;
   int n = ArraySize(g_sentReportKeys);
   ArrayResize(g_sentReportKeys,n+1);
   g_sentReportKeys[n] = key;
   SaveSentReportKeys();
}

string ReportDataFileName()
{
   return("KamarAIS_ReportData_" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + ".csv");
}

string ReportSentFileName()
{
   return("KamarAIS_ReportSent_" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + ".csv");
}

bool ReportEntryExists(const string baseKey,const string chatId)
{
   for(int i=0;i<ArraySize(g_reportEntries);i++)
      if(g_reportEntries[i].baseKey==baseKey && g_reportEntries[i].chatId==chatId)
         return(true);
   return(false);
}

void SaveReportData()
{
   if(!Restore_Report_Data) return;
   int h=FileOpen(ReportDataFileName(),FILE_WRITE|FILE_CSV|FILE_ANSI,';');
   if(h==INVALID_HANDLE) return;
   for(int i=0;i<ArraySize(g_reportEntries);i++)
   {
      FileWrite(h,
                g_reportEntries[i].baseKey,
                g_reportEntries[i].chatId,
                IntegerToString((int)g_reportEntries[i].sentTime),
                IntegerToString(g_reportEntries[i].dir),
                g_reportEntries[i].pair,
                g_reportEntries[i].timeframe,
                IntegerToString(g_reportEntries[i].bestPips),
                IntegerToString(g_reportEntries[i].bestRank),
                (g_reportEntries[i].closedLoss ? "1" : "0"));
   }
   FileClose(h);
}

void LoadReportData()
{
   if(!Restore_Report_Data) return;
   int h=FileOpen(ReportDataFileName(),FILE_READ|FILE_CSV|FILE_ANSI,';');
   if(h==INVALID_HANDLE) return;
   while(!FileIsEnding(h))
   {
      string baseKey=FileReadString(h);
      if(baseKey=="" && FileIsEnding(h)) break;
      string chatId=FileReadString(h);
      string st=FileReadString(h);
      string dir=FileReadString(h);
      string pair=FileReadString(h);
      string tf=FileReadString(h);
      string bp=FileReadString(h);
      string br=FileReadString(h);
      string cl=FileReadString(h);
      if(baseKey=="" || chatId=="") continue;
      if(ReportEntryExists(baseKey,chatId)) continue;
      int n=ArraySize(g_reportEntries);
      ArrayResize(g_reportEntries,n+1);
      g_reportEntries[n].baseKey=baseKey;
      g_reportEntries[n].chatId=chatId;
      g_reportEntries[n].sentTime=(datetime)StringToInteger(st);
      g_reportEntries[n].dir=(int)StringToInteger(dir);
      g_reportEntries[n].pair=pair;
      g_reportEntries[n].timeframe=tf;
      g_reportEntries[n].bestPips=(int)StringToInteger(bp);
      g_reportEntries[n].bestRank=(int)StringToInteger(br);
      g_reportEntries[n].closedLoss=(cl=="1");
   }
   FileClose(h);
}

void SaveSentReportKeys()
{
   if(!Restore_Report_Data) return;
   int h=FileOpen(ReportSentFileName(),FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h==INVALID_HANDLE) return;
   for(int i=0;i<ArraySize(g_sentReportKeys);i++)
      FileWriteString(h,g_sentReportKeys[i]+"\n");
   FileClose(h);
}

void LoadSentReportKeys()
{
   if(!Restore_Report_Data) return;
   int h=FileOpen(ReportSentFileName(),FILE_READ|FILE_TXT|FILE_ANSI);
   if(h==INVALID_HANDLE) return;
   while(!FileIsEnding(h))
   {
      string key=FileReadString(h);
      StringTrimLeft(key);
      StringTrimRight(key);
      if(key=="" || ReportAlreadySent(key)) continue;
      int n=ArraySize(g_sentReportKeys);
      ArrayResize(g_sentReportKeys,n+1);
      g_sentReportKeys[n]=key;
   }
   FileClose(h);
}

int FindLifecycleIndex(const string baseKey)
{
   for(int i=0; i<ArraySize(g_zoneLifecycle); i++)
   {
      if(g_zoneLifecycle[i].baseKey == baseKey)
         return(i);
   }
   return(-1);
}

int EnsureLifecycleIndex(const string baseKey,const ZoneState &z)
{
   int idx = FindLifecycleIndex(baseKey);
   if(idx >= 0)
      return(idx);

   int n = ArraySize(g_zoneLifecycle);
   ArrayResize(g_zoneLifecycle,n+1);
   g_zoneLifecycle[n].baseKey = baseKey;
   g_zoneLifecycle[n].entryActive = false;
   g_zoneLifecycle[n].lastCallPrice = (z.dir == 1 ? MathMax(z.top,z.bottom) : MathMin(z.top,z.bottom));
   g_zoneLifecycle[n].lastRunningStep = 0;
   g_zoneLifecycle[n].postTp3RunningStep = 0;
   g_zoneLifecycle[n].tp1Sent = false;
   g_zoneLifecycle[n].tp2Sent = false;
   g_zoneLifecycle[n].tp3Sent = false;
   g_zoneLifecycle[n].hold1Sent = false;
   g_zoneLifecycle[n].hold2Sent = false;
   g_zoneLifecycle[n].hold3Sent = false;
   g_zoneLifecycle[n].rrOneToOneSent = false;
   g_zoneLifecycle[n].cutLossSent = false;
   g_zoneLifecycle[n].slotReleased = false;
   g_zoneLifecycle[n].tickTouchConfirmed = false;
   g_zoneLifecycle[n].tickTouchBarTime = 0;
   g_zoneLifecycle[n].touchConfirmTime = 0;
   g_zoneLifecycle[n].alertStartTime = 0;
   g_zoneLifecycle[n].alertStartMsc = 0;
   g_zoneLifecycle[n].requireNewTouchAfterAlert = false;
   g_zoneLifecycle[n].touchedAfterAlert = false;
   g_zoneLifecycle[n].entryTouchAlertSent = false;
   g_zoneLifecycle[n].highriskNearSeen = false;
   g_zoneLifecycle[n].highriskWarningSent = false;
   return(n);
}


void ResetLifecycleForNewAlert(const string baseKey,const ZoneState &z,const bool requireFreshTouch)
{
   int idx = EnsureLifecycleIndex(baseKey,z);
   double highPrice = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double lowPrice  = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double zoneStart = (z.dir == 1 ? highPrice : lowPrice);

   g_zoneLifecycle[idx].alertStartTime = TimeCurrent();
   MqlTick resetTick;
   if(SymbolInfoTick(_Symbol,resetTick) && resetTick.time_msc > 0)
      g_zoneLifecycle[idx].alertStartMsc = resetTick.time_msc;
   else
      g_zoneLifecycle[idx].alertStartMsc = (ulong)g_zoneLifecycle[idx].alertStartTime * 1000;
   g_zoneLifecycle[idx].entryActive = false;
   g_zoneLifecycle[idx].lastCallPrice = zoneStart;
   g_zoneLifecycle[idx].lastRunningStep = 0;
   g_zoneLifecycle[idx].postTp3RunningStep = 0;
   g_zoneLifecycle[idx].tp1Sent = false;
   g_zoneLifecycle[idx].tp2Sent = false;
   g_zoneLifecycle[idx].tp3Sent = false;
   g_zoneLifecycle[idx].hold1Sent = false;
   g_zoneLifecycle[idx].hold2Sent = false;
   g_zoneLifecycle[idx].hold3Sent = false;
   g_zoneLifecycle[idx].rrOneToOneSent = false;
   g_zoneLifecycle[idx].cutLossSent = false;
   g_zoneLifecycle[idx].slotReleased = false;
   g_zoneLifecycle[idx].tickTouchConfirmed = false;
   g_zoneLifecycle[idx].tickTouchBarTime = 0;
   g_zoneLifecycle[idx].touchConfirmTime = 0;
   g_zoneLifecycle[idx].requireNewTouchAfterAlert = requireFreshTouch;
   g_zoneLifecycle[idx].touchedAfterAlert = false;
   g_zoneLifecycle[idx].entryTouchAlertSent = false;
   g_zoneLifecycle[idx].highriskNearSeen = false;
   g_zoneLifecycle[idx].highriskWarningSent = false;

   if(Debug_Update_Status_Log)
      Print("Lifecycle reset untuk alert baru: ",baseKey,
            " | requireNewTouch=",(requireFreshTouch ? "true" : "false"),
            " | alertStart=",TimeToString(g_zoneLifecycle[idx].alertStartTime,TIME_DATE|TIME_SECONDS));
}

string PipsTextFromPoints(const int points)
{
   if(Points_Per_Pip <= 0)
      return(IntegerToString(points) + " Pips");

   double pips = (double)points / (double)Points_Per_Pip;
   if(MathAbs(pips - MathRound(pips)) < 0.000001)
      return(IntegerToString((int)MathRound(pips)) + " Pips");
   return(DoubleToString(pips,1) + " Pips");
}

string TpHitStatusText(const int tpNumber,const double zoneStart,const double tpLevel)
{
   int profitPoints = (int)MathRound(MathAbs(tpLevel - zoneStart) / _Point);
   return("✅ HIT TP" + IntegerToString(tpNumber) + " - Profit " + PipsTextFromPoints(profitPoints));
}

string HoldHitStatusText(const int holdNumber,const double zoneStart,const double holdLevel)
{
   int profitPoints = (int)MathRound(MathAbs(holdLevel - zoneStart) / _Point);
   return("✅ HIT Hold " + IntegerToString(holdNumber) + " - Profit " + PipsTextFromPoints(profitPoints));
}

string RROneToOneStatusText(const int zoneSizePoints)
{
   int safePoints = zoneSizePoints;
   if(safePoints < 0)
      safePoints = 0;
   return(RR_1_1_Status_Text + " - Profit " + PipsTextFromPoints(safePoints));
}

void GetZoneTradeLevels(const ZoneState &z,double &zoneStart,double &zoneEnd,double &tp1,double &tp2,double &tp3,double &cutLoss,string &priceZone)
{
   double highPrice = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double lowPrice  = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));

   if(z.dir == 1)
   {
      zoneStart = highPrice;
      zoneEnd   = lowPrice;
      priceZone = DoubleToString(zoneStart,_Digits) + " - " + DoubleToString(zoneEnd,_Digits);
      tp1       = zoneStart + (Take_Profit_1_Points * _Point);
      tp2       = zoneStart + (Take_Profit_2_Points * _Point);
      tp3       = zoneStart + (Take_Profit_3_Points * _Point);
      cutLoss   = zoneEnd   - (Cut_Loss_Points      * _Point);
   }
   else
   {
      zoneStart = lowPrice;
      zoneEnd   = highPrice;
      priceZone = DoubleToString(zoneStart,_Digits) + " - " + DoubleToString(zoneEnd,_Digits);
      tp1       = zoneStart - (Take_Profit_1_Points * _Point);
      tp2       = zoneStart - (Take_Profit_2_Points * _Point);
      tp3       = zoneStart - (Take_Profit_3_Points * _Point);
      cutLoss   = zoneEnd   + (Cut_Loss_Points      * _Point);
   }
}

void GetHoldLevels(const ZoneState &z,double zoneStart,double &hold1,double &hold2,double &hold3)
{
   if(z.dir == 1)
   {
      hold1 = zoneStart + (Hold_1_Points * _Point);
      hold2 = zoneStart + (Hold_2_Points * _Point);
      hold3 = zoneStart + (Hold_3_Points * _Point);
   }
   else
   {
      hold1 = zoneStart - (Hold_1_Points * _Point);
      hold2 = zoneStart - (Hold_2_Points * _Point);
      hold3 = zoneStart - (Hold_3_Points * _Point);
   }
}

string CleanStatusForShortReply(string statusText)
{
   // Simbol dipindahkan ke akhir kalimat agar reply lebih rapi.
   StringReplace(statusText,"✅ ","");
   StringReplace(statusText,"❌ ","");

   bool isLoss = (StringFind(statusText,"Cut Loss") >= 0 || StringFind(statusText,"CUT LOSS") >= 0);
   string suffix = (isLoss ? " ❌" : " ✅");
   if(StringFind(statusText,"✅") < 0 && StringFind(statusText,"❌") < 0)
      statusText += suffix;
   return(statusText);
}

string BuildZoneUpdateText(const string statusText,const ZoneState &z,const string zoneId,const string priceZone,const string targetKey)
{
   string cleanStatus = FormatDisplayStatusForTarget(targetKey,statusText);
   string text = HeaderForStatusForTarget(targetKey,statusText,z) + "\n\n";

   if(StringFind(statusText,"Harga Masuk Zona Entry") >= 0)
   {
      string header = (z.dir==1 ? ChannelEntryBuyHeader(targetKey) : ChannelEntrySellHeader(targetKey));
      text = header + " - " + TimeframeToText(_Period) + "\n\n";
      text += ChannelEntryText(targetKey) + "\n\n";
      text += "ID Zona: " + zoneId;
      return(text);
   }

   if(StringFind(statusText,"Zona Berubah Highrisk") >= 0)
   {
      text = ChannelHighriskHeader(targetKey) + "\n\n";
      text += "Skenario: " + ZoneSignalText(z) + "\n";
      text += "Status: " + ChannelHighriskText(targetKey) + "\n";
      text += "Catatan: " + ChannelHighriskNote(targetKey) + "\n\n";
      text += "ID Zona: " + zoneId;
      return(text);
   }

   text += "ID Zona: " + zoneId + "\n";
   text += "Skenario: " + ZoneSignalText(z) + "\n";
   text += "Status: " + cleanStatus;
   return(text);
}

bool TargetEnabledOnly(const bool enabled,const string chatId)
{
   if(!Telegram_ON || !enabled)
      return(false);
   if(Bot_Token == "" || chatId == "")
      return(false);
   return(true);
}

void SendZoneUpdateToTarget(const ZoneState &z,const string baseKey,const string statusText,const bool enabled,const string chatId,const int topicId)
{
   if(!TargetEnabledOnly(enabled,chatId))
      return;

   string targetKey = TelegramTargetKey(chatId,topicId);
   int idx = FindSentZoneMessageIndexByBaseKey(baseKey,targetKey);
   if(idx < 0)
      return; // Channel ini tidak menerima signal awal, jadi tidak dikirim update.

   double zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss;
   string priceZone;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);

   if(!Send_Update_Reply)
   {
      UpdateReportEntryByStatus(baseKey,targetKey,statusText);
      return;
   }

   int newMessageId = 0;
   string msg = BuildZoneUpdateText(statusText,z,g_sentZoneMessages[idx].zoneId,priceZone,targetKey);
   bool isEntryTouchUpdate = (StringFind(statusText,"Harga Masuk Zona Entry") >= 0);
   bool allowUpdateScreenshot = (Update_Screenshot_ON || (isEntryTouchUpdate && Entry_Touch_Screenshot_ON));

   // Jika screenshot aktif untuk update, kirim FOTO + caption update sebagai reply utama.
   // Jika upload foto gagal, fallback ke reply teks supaya update tetap masuk.
   int oldUpdateId = 0;
   int oldIdx = FindLatestUpdateIndex(baseKey,targetKey);
   if(oldIdx >= 0)
      oldUpdateId = g_latestUpdateMessages[oldIdx].messageId;

   bool updateSent = false;
   int sentUpdateId = 0;

   if(Screenshot_ON && allowUpdateScreenshot && Send_Screenshot_On_Update)
   {
      DrawTradeLinesForSingleZone(z);
      string cap = (Update_Screenshot_Use_Caption ? msg : "");
      int replyId = (Update_Screenshot_As_Reply ? g_sentZoneMessages[idx].messageId : 0);
      if(SendChartScreenshotToTelegram(chatId,topicId,cap,replyId))
      {
         sentUpdateId = g_lastScreenshotMessageId;
         updateSent = true;
      }
   }

   if(!updateSent)
   {
      if(SendTelegramMessageTo(chatId,msg,g_sentZoneMessages[idx].messageId,newMessageId,topicId))
      {
         sentUpdateId = newMessageId;
         updateSent = true;
      }
   }

   if(updateSent)
   {
      // v1.97: urutan Telegram dibuat lebih aman dan cepat:
      // 1) update baru terkirim dulu, 2) posting awal diedit,
      // 3) message_id update baru disimpan, 4) update lama baru dihapus/di-queue.
      // Delete gagal tidak boleh menahan update penting berikutnya.
      UpdateReportEntryByStatus(baseKey,targetKey,statusText);
      EditOriginalSignalMessageForTarget(z,baseKey,targetKey,idx,statusText);
      StoreLatestUpdateMessage(baseKey,targetKey,sentUpdateId);

      if(Keep_Only_Latest_Update && oldUpdateId > 0 && oldUpdateId != sentUpdateId)
      {
         if(Delete_Old_Update_Async)
            AddPendingDelete(chatId,topicId,oldUpdateId);
         else if(!DeleteTelegramMessage(chatId,oldUpdateId))
            AddPendingDelete(chatId,topicId,oldUpdateId);
      }

      // 0 = update terbaru tetap muncul. Jika diisi >0, pesan update baru juga akan dihapus otomatis.
      int autoDeleteDelay = Update_Message_Delete_Seconds;
      if(autoDeleteDelay < 0) autoDeleteDelay = 0;
      if(autoDeleteDelay > 0)
         AddPendingDeleteDelayed(chatId,topicId,sentUpdateId,autoDeleteDelay);
   }
}

void UpdateZoneResultDisplayOnlyToTarget(const ZoneState &z,const string baseKey,const string statusText,const bool enabled,const string chatId,const int topicId)
{
   if(!TargetEnabledOnly(enabled,chatId))
      return;
   string targetKey = TelegramTargetKey(chatId,topicId);
   int idx = FindSentZoneMessageIndexByBaseKey(baseKey,targetKey);
   if(idx < 0)
      return;
   UpdateReportEntryByStatus(baseKey,targetKey,statusText);
   EditOriginalSignalMessageForTarget(z,baseKey,targetKey,idx,statusText);
}

void UpdateZoneResultDisplayOnlyToOriginalTargets(const ZoneState &z,const string baseKey,const string statusText)
{
   SendWebsiteZoneUpdate(z,baseKey,statusText);

   UpdateZoneResultDisplayOnlyToTarget(z,baseKey,statusText,Channel_1_Enable,Channel_1_ID_or_Username,Channel_1_Topic_ID);
   UpdateZoneResultDisplayOnlyToTarget(z,baseKey,statusText,Channel_2_Enable,Channel_2_ID_or_Username,Channel_2_Topic_ID);
   UpdateZoneResultDisplayOnlyToTarget(z,baseKey,statusText,Channel_3_Enable,Channel_3_ID_or_Username,Channel_3_Topic_ID);
   UpdateZoneResultDisplayOnlyToTarget(z,baseKey,statusText,Channel_4_Enable,Channel_4_ID_or_Username,Channel_4_Topic_ID);
   UpdateZoneResultDisplayOnlyToTarget(z,baseKey,statusText,Channel_5_Enable,Channel_5_ID_or_Username,Channel_5_Topic_ID);
}

bool IsLastCallAlertMilestone(const int updatePoints)
{
   if(Points_Per_Pip <= 0)
      return(false);
   double pipsD = (double)updatePoints / (double)Points_Per_Pip;
   int pips = (int)MathRound(pipsD);
   if(MathAbs(pipsD - (double)pips) > 0.000001)
      return(false);
   if(LastCall_Milestone_Start_Pips <= 0 || LastCall_Milestone_Step_Pips <= 0)
      return(false);
   if(pips < LastCall_Milestone_Start_Pips)
      return(false);
   return(((pips - LastCall_Milestone_Start_Pips) % LastCall_Milestone_Step_Pips) == 0);
}

void SendZoneUpdateToOriginalTargets(const ZoneState &z,const string baseKey,const string statusText)
{
   // v1.90: Jika update terbaru sudah lebih besar dari RR 1:1, jangan kirim RR 1:1 belakangan.
   if(StringFind(statusText,"RR 1:1") < 0 && StringFind(statusText,"Profit") >= 0)
   {
      double zs,ze,t1,t2,t3,cl; string pz;
      GetZoneTradeLevels(z,zs,ze,t1,t2,t3,cl,pz);
      int zoneSizePts = (int)MathRound(MathAbs(zs-ze)/_Point);
      int statusPips = ExtractPipsFromStatus(statusText);
      int statusPts = statusPips * Points_Per_Pip;
      int li = FindLifecycleIndex(baseKey);
      if(li >= 0 && zoneSizePts > 0 && statusPts > zoneSizePts)
         g_zoneLifecycle[li].rrOneToOneSent = true;
   }

   SendWebsiteZoneUpdate(z,baseKey,statusText);

   SendZoneUpdateToTarget(z,baseKey,statusText,Channel_1_Enable,Channel_1_ID_or_Username,Channel_1_Topic_ID);
   SendZoneUpdateToTarget(z,baseKey,statusText,Channel_2_Enable,Channel_2_ID_or_Username,Channel_2_Topic_ID);
   SendZoneUpdateToTarget(z,baseKey,statusText,Channel_3_Enable,Channel_3_ID_or_Username,Channel_3_Topic_ID);
   SendZoneUpdateToTarget(z,baseKey,statusText,Channel_4_Enable,Channel_4_ID_or_Username,Channel_4_Topic_ID);
   SendZoneUpdateToTarget(z,baseKey,statusText,Channel_5_Enable,Channel_5_ID_or_Username,Channel_5_Topic_ID);

   if(Enable_MT5_Push_Notification)
      SendNotification("UPDATE KAJIAN " + _Symbol + " " + TimeframeToText(_Period) + " " + ZoneSignalText(z) + " | " + statusText);
}


//====================================================================
// REPORT / REKAP HELPERS
//====================================================================
datetime TimeWIBNow()
{
   // v1.57 Stable Topic: semua jadwal rekap dibaca langsung sebagai WIB/GMT+7.
   // Tidak bergantung lagi pada waktu server broker agar daily/weekly/monthly report tidak meleset.
   if(Report_Use_WIB_Time)
      return(TimeGMT() + WIB_UTC_Offset * 3600);
   return(TimeCurrent());
}

int DateKey(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   return(dt.year*10000 + dt.mon*100 + dt.day);
}

int MonthKey(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   return(dt.year*100 + dt.mon);
}

int WeekKeySaturday(const datetime t)
{
   // Legacy key. Tetap disimpan untuk kompatibilitas data lama.
   MqlDateTime dt; TimeToStruct(t,dt);
   int daysToSaturday = 6 - dt.day_of_week; // day_of_week: Sunday=0 ... Saturday=6
   datetime sat = t + daysToSaturday * 86400;
   return(DateKey(sat));
}

datetime DateStart(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   dt.hour=0; dt.min=0; dt.sec=0;
   return(StructToTime(dt));
}

datetime DateEnd(const datetime t)
{
   return(DateStart(t) + 86399);
}

datetime WeekMondayStart(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   int backDays = dt.day_of_week - 1; // Monday=1
   if(dt.day_of_week==0) backDays = 6; // Sunday: pakai Senin minggu sebelumnya
   return(DateStart(t - backDays*86400));
}

datetime WeekFridayEnd(const datetime t)
{
   return(WeekMondayStart(t) + 5*86400 - 1); // Senin 00:00 sampai Jumat 23:59:59
}

datetime MonthStart(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   dt.day=1; dt.hour=0; dt.min=0; dt.sec=0;
   return(StructToTime(dt));
}

datetime MonthEnd(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   dt.day=1; dt.hour=0; dt.min=0; dt.sec=0;
   if(dt.mon==12) { dt.mon=1; dt.year++; }
   else dt.mon++;
   return(StructToTime(dt)-1);
}

void ReportPeriodRange(const string periodLabel,const datetime now,datetime &startTime,datetime &endTime)
{
   if(periodLabel=="HARIAN")
   {
      startTime = DateStart(now);
      endTime   = DateEnd(now);
      return;
   }
   if(periodLabel=="MINGGUAN")
   {
      startTime = WeekMondayStart(now);
      endTime   = WeekFridayEnd(now);
      return;
   }
   if(periodLabel=="BULANAN")
   {
      MqlDateTime dt; TimeToStruct(now,dt);
      datetime ref = now;
      // Jika rekap bulanan dijadwalkan tanggal 1, yang direkap adalah bulan sebelumnya yang sudah penuh.
      if(dt.day==1) ref = now - 86400;
      startTime = MonthStart(ref);
      endTime   = MonthEnd(ref);
      return;
   }
   startTime = DateStart(now);
   endTime   = DateEnd(now);
}

string ReportPeriodKey(const string periodLabel,const datetime now)
{
   datetime st,en;
   ReportPeriodRange(periodLabel,now,st,en);
   return(IntegerToString(DateKey(st)) + "-" + IntegerToString(DateKey(en)));
}

string ReportPeriodTitle(const string periodLabel)
{
   if(periodLabel=="HARIAN")   return(Report_Title_Daily);
   if(periodLabel=="MINGGUAN") return(Report_Title_Weekly);
   if(periodLabel=="BULANAN")  return(Report_Title_Monthly);
   return(periodLabel);
}

bool TimeToSendReport(const string hhmm)
{
   int targetMin = TimeStringToMinutes(hhmm);
   if(targetMin < 0) return(false);

   MqlDateTime dt; TimeToStruct(TimeWIBNow(),dt);
   int nowMin = dt.hour*60 + dt.min;

   // Rekap dikirim pada hari yang sama begitu waktu WIB sudah mencapai jam setting.
   // Key harian/mingguan/bulanan per channel memastikan hanya terkirim 1x per periode.
   return(nowMin >= targetMin);
}

void StoreReportEntry(const string baseKey,const string chatId,const ZoneState &z)
{
   for(int i=0;i<ArraySize(g_reportEntries);i++)
      if(g_reportEntries[i].baseKey==baseKey && g_reportEntries[i].chatId==chatId)
         return;
   int n=ArraySize(g_reportEntries);
   ArrayResize(g_reportEntries,n+1);
   g_reportEntries[n].baseKey=baseKey;
   g_reportEntries[n].chatId=chatId;
   g_reportEntries[n].sentTime=TimeWIBNow();
   g_reportEntries[n].dir=z.dir;
   g_reportEntries[n].pair=_Symbol;
   g_reportEntries[n].timeframe=TimeframeToText(_Period);
   g_reportEntries[n].bestPips=0;
   g_reportEntries[n].bestRank=0;
   g_reportEntries[n].closedLoss=false;
   SaveReportData();
}

int ExtractPipsFromStatus(const string statusText)
{
   string parts[];
   int n=StringSplit(statusText,' ',parts);
   for(int i=0;i<n;i++)
   {
      string token=parts[i];
      StringReplace(token,"+","");
      StringReplace(token,"-","");
      int v=(int)StringToInteger(token);
      if(v>0 && i+1<n)
      {
         string next=parts[i+1];
         StringToLower(next);
         if(StringFind(next,"pip")>=0)
            return(v);
      }
   }
   return(0);
}

void UpdateReportEntryByStatus(const string baseKey,const string chatId,const string statusText)
{
   // Highrisk adalah peringatan pra-entry. Jangan dihitung sebagai profit/loss rekap.
   if(StringFind(statusText,"Zona Berubah Highrisk") >= 0)
      return;

   int pips=ExtractPipsFromStatus(statusText);
   int rank=0;
   bool loss=false;
   if(StringFind(statusText,"Cut Loss")>=0 || StringFind(statusText,"CUT LOSS")>=0)
   {
      rank=-1; loss=true;
   }
   else if(StringFind(statusText,"Hold 3")>=0 || StringFind(statusText,"HOLD 3")>=0) rank=7;
   else if(StringFind(statusText,"Hold 2")>=0 || StringFind(statusText,"HOLD 2")>=0) rank=6;
   else if(StringFind(statusText,"Hold 1")>=0 || StringFind(statusText,"HOLD 1")>=0) rank=5;
   else if(StringFind(statusText,"TP3")>=0) rank=4;
   else if(StringFind(statusText,"TP2")>=0) rank=3;
   else if(StringFind(statusText,"TP1")>=0) rank=2;
   else if(StringFind(statusText,"Profit")>=0) rank=1;

   for(int i=0;i<ArraySize(g_reportEntries);i++)
   {
      if(g_reportEntries[i].baseKey==baseKey && g_reportEntries[i].chatId==chatId)
      {
         if(loss)
         {
            // Loss hanya menang jika belum pernah mencapai profit/TP lebih tinggi.
            if(g_reportEntries[i].bestRank<=0)
            {
               g_reportEntries[i].bestRank=-1;
               g_reportEntries[i].closedLoss=true;
               g_reportEntries[i].bestPips=-pips;
               SaveReportData();
            }
         }
         else if(rank > g_reportEntries[i].bestRank || (rank == g_reportEntries[i].bestRank && pips > g_reportEntries[i].bestPips))
         {
            g_reportEntries[i].bestRank=rank;
            g_reportEntries[i].bestPips=pips;
            SaveReportData();
         }
         return;
      }
   }
}

string DateTextID(const datetime t)
{
   MqlDateTime dt; TimeToStruct(t,dt);
   string months[12]={"Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"};
   return(IntegerToString(dt.day)+" "+months[dt.mon-1]+" "+IntegerToString(dt.year));
}

string DateRangeTextID(const datetime startTime,const datetime endTime)
{
   if(DateKey(startTime)==DateKey(endTime))
      return(DateTextID(startTime));
   return(DateTextID(startTime)+" sampai "+DateTextID(endTime));
}

string BuildReportText(const string title,const string periodLabel,const string chatId)
{
   datetime now=TimeWIBNow();
   datetime periodStart, periodEnd;
   ReportPeriodRange(periodLabel,now,periodStart,periodEnd);

   string currentTf = TimeframeToText(_Period);
   int total=0,buy=0,sell=0,profit=0,loss=0,open=0,totalPips=0;
   for(int i=0;i<ArraySize(g_reportEntries);i++)
   {
      if(g_reportEntries[i].chatId!=chatId) continue;
      if(g_reportEntries[i].pair != _Symbol) continue;
      if(Report_Per_Timeframe && g_reportEntries[i].timeframe != currentTf) continue;

      datetime entryTime = g_reportEntries[i].sentTime;
      if(entryTime < periodStart || entryTime > periodEnd) continue;

      total++;
      if(g_reportEntries[i].dir==1) buy++; else sell++;
      if(g_reportEntries[i].bestRank>0) profit++;
      else if(g_reportEntries[i].bestRank<0) loss++;
      else open++;
      totalPips += g_reportEntries[i].bestPips;
   }
   double wr = (profit+loss>0 ? (100.0*profit/(profit+loss)) : 0.0);
   string pipsTxt=(totalPips>=0?"+":"")+IntegerToString(totalPips)+" Pips";
   string wrTxt=DoubleToString(wr,1);
   if(MathAbs(wr-MathRound(wr))<0.0001) wrTxt=IntegerToString((int)MathRound(wr));

   string header = title + " - " + ReportPeriodTitle(periodLabel);
   string txt = header+"\n"+
          "Periode: "+DateRangeTextID(periodStart,periodEnd)+"\n"+
          "Pair: "+_Symbol+"\n"+
          "Timeframe: "+currentTf+"\n\n"+
          "Total Kajian: "+IntegerToString(total)+"\n"+
          "BUY: "+IntegerToString(buy)+"\n"+
          "SELL: "+IntegerToString(sell)+"\n";
   if(Show_Open_Signals_In_Report)
      txt += "Open: "+IntegerToString(open)+"\n";
   txt += "\n"+
          Report_Loss_Symbol+" "+Report_Label_Loss+": "+IntegerToString(loss)+" \n"+
          Report_Profit_Symbol+" "+Report_Label_Profit+": "+IntegerToString(profit)+"\n\n"+
          "Total Pergerakan: "+pipsTxt+"\n"+
          Report_Label_Winrate + ": "+wrTxt+"%";
   return(txt);
}

void SendReportToChannel(const bool chEnabled,const bool reportEnabled,const string chatId,const int topicId,const string title,const string periodLabel)
{
   if(!Report_ON || !chEnabled || !reportEnabled || chatId=="") return;
   if(!TargetEnabledOnly(chEnabled,chatId)) return;
   string targetKey = TelegramTargetKey(chatId,topicId);
   datetime nowWib = TimeWIBNow();
   string periodKey = periodLabel + "|" + targetKey + "|" + _Symbol + "|" + TimeframeToText(_Period) + "|" + ReportPeriodKey(periodLabel,nowWib);
   if(ReportAlreadySent(periodKey)) return;
   if(SendTelegramMessageTo(chatId,BuildReportText(title,periodLabel,targetKey),topicId))
      MarkReportSent(periodKey);
}

void SendReports(const string periodLabel)
{
   // Manual/fallback: kirim ke semua channel yang report-nya aktif.
   SendReportToChannel(Channel_1_Enable,Channel_1_Report_Enable,Channel_1_ID_or_Username,Channel_1_Topic_ID,Channel_1_Report_Title,periodLabel);
   SendReportToChannel(Channel_2_Enable,Channel_2_Report_Enable,Channel_2_ID_or_Username,Channel_2_Topic_ID,Channel_2_Report_Title,periodLabel);
   SendReportToChannel(Channel_3_Enable,Channel_3_Report_Enable,Channel_3_ID_or_Username,Channel_3_Topic_ID,Channel_3_Report_Title,periodLabel);
   SendReportToChannel(Channel_4_Enable,Channel_4_Report_Enable,Channel_4_ID_or_Username,Channel_4_Topic_ID,Channel_4_Report_Title,periodLabel);
   SendReportToChannel(Channel_5_Enable,Channel_5_Report_Enable,Channel_5_ID_or_Username,Channel_5_Topic_ID,Channel_5_Report_Title,periodLabel);
}

void ProcessChannelScheduledReports(
   const bool chEnabled,
   const bool reportEnabled,
   const string chatId,
   const int topicId,
   const string reportTitle,
   const bool dailyOn,
   const string dailyTimeWIB,
   const bool weeklyOn,
   const string weeklyTimeWIB,
   const bool monthlyOn,
   const string monthlyTimeWIB,
   int &lastDailyKey,
   int &lastWeeklyKey,
   int &lastMonthlyKey
)
{
   if(!Report_ON || !chEnabled || !reportEnabled || chatId=="")
      return;

   datetime now=TimeWIBNow();
   MqlDateTime dt; TimeToStruct(now,dt);

   int today=DateKey(now);
   if(dailyOn && TimeToSendReport(dailyTimeWIB) && lastDailyKey!=today)
   {
      lastDailyKey=today;
      SendReportToChannel(chEnabled,reportEnabled,chatId,topicId,reportTitle,"HARIAN");
   }

   int weekKey=WeekKeySaturday(now);
   if(weeklyOn && dt.day_of_week==6 && TimeToSendReport(weeklyTimeWIB) && lastWeeklyKey!=weekKey)
   {
      lastWeeklyKey=weekKey;
      SendReportToChannel(chEnabled,reportEnabled,chatId,topicId,reportTitle,"MINGGUAN");
   }

   int monthKey=MonthKey(now);
   if(monthlyOn && dt.day==1 && TimeToSendReport(monthlyTimeWIB) && lastMonthlyKey!=monthKey)
   {
      lastMonthlyKey=monthKey;
      SendReportToChannel(chEnabled,reportEnabled,chatId,topicId,reportTitle,"BULANAN");
   }
}

void ProcessScheduledReports()
{
   if(!Report_ON) return;

   ProcessChannelScheduledReports(Channel_1_Enable,Channel_1_Report_Enable,Channel_1_ID_or_Username,Channel_1_Topic_ID,Channel_1_Report_Title,
                                  Channel_1_Daily_Report,Channel_1_Daily_Time_WIB,
                                  Channel_1_Weekly_Report,Channel_1_Weekly_Time_WIB,
                                  Channel_1_Monthly_Report,Channel_1_Monthly_Time_WIB,
                                  g_ch1_lastDailyReportKey,g_ch1_lastWeeklyReportKey,g_ch1_lastMonthlyReportKey);

   ProcessChannelScheduledReports(Channel_2_Enable,Channel_2_Report_Enable,Channel_2_ID_or_Username,Channel_2_Topic_ID,Channel_2_Report_Title,
                                  Channel_2_Daily_Report,Channel_2_Daily_Time_WIB,
                                  Channel_2_Weekly_Report,Channel_2_Weekly_Time_WIB,
                                  Channel_2_Monthly_Report,Channel_2_Monthly_Time_WIB,
                                  g_ch2_lastDailyReportKey,g_ch2_lastWeeklyReportKey,g_ch2_lastMonthlyReportKey);

   ProcessChannelScheduledReports(Channel_3_Enable,Channel_3_Report_Enable,Channel_3_ID_or_Username,Channel_3_Topic_ID,Channel_3_Report_Title,
                                  Channel_3_Daily_Report,Channel_3_Daily_Time_WIB,
                                  Channel_3_Weekly_Report,Channel_3_Weekly_Time_WIB,
                                  Channel_3_Monthly_Report,Channel_3_Monthly_Time_WIB,
                                  g_ch3_lastDailyReportKey,g_ch3_lastWeeklyReportKey,g_ch3_lastMonthlyReportKey);

   ProcessChannelScheduledReports(Channel_4_Enable,Channel_4_Report_Enable,Channel_4_ID_or_Username,Channel_4_Topic_ID,Channel_4_Report_Title,
                                  Channel_4_Daily_Report,Channel_4_Daily_Time_WIB,
                                  Channel_4_Weekly_Report,Channel_4_Weekly_Time_WIB,
                                  Channel_4_Monthly_Report,Channel_4_Monthly_Time_WIB,
                                  g_ch4_lastDailyReportKey,g_ch4_lastWeeklyReportKey,g_ch4_lastMonthlyReportKey);

   ProcessChannelScheduledReports(Channel_5_Enable,Channel_5_Report_Enable,Channel_5_ID_or_Username,Channel_5_Topic_ID,Channel_5_Report_Title,
                                  Channel_5_Daily_Report,Channel_5_Daily_Time_WIB,
                                  Channel_5_Weekly_Report,Channel_5_Weekly_Time_WIB,
                                  Channel_5_Monthly_Report,Channel_5_Monthly_Time_WIB,
                                  g_ch5_lastDailyReportKey,g_ch5_lastWeeklyReportKey,g_ch5_lastMonthlyReportKey);
}


//====================================================================
// WEBSITE API - KAMAR STUDY UPDATE (STEP 24AH)
//====================================================================
bool WebsiteZoneAlreadySent(const string baseKey)
{
   for(int i=0; i<ArraySize(g_websiteSentBaseKeys); i++)
   {
      if(g_websiteSentBaseKeys[i] == baseKey)
         return(true);
   }
   return(false);
}

void MarkWebsiteZoneSent(const string baseKey)
{
   if(WebsiteZoneAlreadySent(baseKey))
      return;
   int n = ArraySize(g_websiteSentBaseKeys);
   ArrayResize(g_websiteSentBaseKeys,n+1);
   g_websiteSentBaseKeys[n] = baseKey;

   if(ArraySize(g_websiteSentBaseKeys) > 500)
   {
      for(int i=0; i<ArraySize(g_websiteSentBaseKeys)-1; i++)
         g_websiteSentBaseKeys[i] = g_websiteSentBaseKeys[i+1];
      ArrayResize(g_websiteSentBaseKeys,ArraySize(g_websiteSentBaseKeys)-1);
   }
}

string WebsiteJsonEscape(string s)
{
   StringReplace(s,"\\","\\\\");
   StringReplace(s,"\"","\\\"");
   StringReplace(s,"\r","\\r");
   StringReplace(s,"\n","\\n");
   StringReplace(s,"\t","\\t");
   return(s);
}

string WebsiteSafePart(string s)
{
   StringReplace(s,"/","-");
   StringReplace(s,"\\","-");
   StringReplace(s,"|","-");
   StringReplace(s,":","-");
   StringReplace(s," ","-");
   StringReplace(s,".","");
   return(s);
}

uint WebsiteHash(const string raw)
{
   uint h = 2166136261;
   int n = StringLen(raw);
   for(int i=0; i<n; i++)
   {
      ushort ch = StringGetCharacter(raw,i);
      h = (h ^ ch) * 16777619;
   }
   return(h);
}

string WebsiteStableZoneId(const ZoneState &z,const string baseKey)
{
   string prefix = TrimText(Website_Zone_ID_Prefix);
   if(prefix == "") prefix = "KM-STUDY";
   prefix = WebsiteSafePart(prefix);

   string dir = ZoneSignalTextId(z);
   string tf  = TimeframeToText(_Period);
   uint h = WebsiteHash(baseKey);
   string shortHash = IntegerToString((int)(h % 1000000));
   while(StringLen(shortHash) < 6) shortHash = "0" + shortHash;

   return(prefix + "/" + dir + "/" + tf + "-" + IntegerToString((int)z.bornTime) + "-" + shortHash);
}

string WebsiteProgressCodeFromStatus(const string statusText)
{
   if(StringFind(statusText,"TP1") >= 0) return("target_kajian_1");
   if(StringFind(statusText,"TP2") >= 0) return("target_kajian_2");
   if(StringFind(statusText,"TP3") >= 0) return("target_kajian_3");
   if(StringFind(statusText,"Hold 1") >= 0 || StringFind(statusText,"HOLD 1") >= 0) return("target_lanjutan_1");
   if(StringFind(statusText,"Hold 2") >= 0 || StringFind(statusText,"HOLD 2") >= 0) return("target_lanjutan_2");
   if(StringFind(statusText,"Hold 3") >= 0 || StringFind(statusText,"HOLD 3") >= 0) return("target_lanjutan_3");
   if(StringFind(statusText,"Cut Loss") >= 0 || StringFind(statusText,"CUT LOSS") >= 0) return("invalidasi");
   return("");
}

string WebsiteZoneStatusFromStatus(const string statusText,const bool isNewZone)
{
   if(isNewZone) return("FRESH");
   if(StringFind(statusText,"Cut Loss") >= 0 || StringFind(statusText,"CUT LOSS") >= 0) return("INVALID");
   return("ACTIVE");
}


string WebsiteEventTypeFromStatus(const string statusText,const bool isNewZone)
{
   if(isNewZone) return("NEW_ZONE");
   if(StringFind(statusText,"Harga Masuk Zona Entry") >= 0) return("ZONE_ACTIVE");
   if(StringFind(statusText,"Cut Loss") >= 0 || StringFind(statusText,"CUT LOSS") >= 0) return("HIT_INVALIDASI");
   if(StringFind(statusText,"TP1") >= 0 || StringFind(statusText,"TP2") >= 0 || StringFind(statusText,"TP3") >= 0) return("HIT_TARGET_KAJIAN");
   if(StringFind(statusText,"Hold 1") >= 0 || StringFind(statusText,"Hold 2") >= 0 || StringFind(statusText,"Hold 3") >= 0 ||
      StringFind(statusText,"HOLD 1") >= 0 || StringFind(statusText,"HOLD 2") >= 0 || StringFind(statusText,"HOLD 3") >= 0) return("HIT_TARGET_LANJUTAN");
   if(StringFind(statusText,"Website Price Heartbeat") >= 0) return("PRICE_HEARTBEAT");
   if(StringFind(statusText,"Profit") >= 0) return("RUNNING_UPDATE");
   return("RUNNING_UPDATE");
}

bool WebsiteInvalidationLockedLocal(const string baseKey)
{
   int lifeIdx = FindLifecycleIndex(baseKey);
   if(lifeIdx >= 0)
   {
      if(g_zoneLifecycle[lifeIdx].tp1Sent || g_zoneLifecycle[lifeIdx].tp2Sent || g_zoneLifecycle[lifeIdx].tp3Sent)
         return(true);
      if(g_zoneLifecycle[lifeIdx].lastRunningStep > 0)
         return(true);
   }

   int bestPips = WebsiteBestPipsForBaseKey(baseKey,0);
   if(bestPips >= Website_Invalid_Lock_Min_Pips)
      return(true);

   return(false);
}

int WebsiteBestPipsForBaseKey(const string baseKey,const int currentPips)
{
   int best = 0;
   if(currentPips > best) best = currentPips;
   for(int i=0; i<ArraySize(g_reportEntries); i++)
   {
      if(g_reportEntries[i].baseKey != baseKey)
         continue;
      if(g_reportEntries[i].bestPips > best)
         best = g_reportEntries[i].bestPips;
   }
   return(best);
}

string WebsiteNumber(const double value)
{
   return(DoubleToString(NormalizeDouble(value,_Digits),_Digits));
}

string WebsiteInt(const int value)
{
   return(IntegerToString(value));
}

string WebsiteBuildPayload(const ZoneState &z,
                           const string baseKey,
                           const string statusText,
                           const bool isNewZone)
{
   double zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss;
   string priceZone;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);

   double hold1,hold2,hold3;
   GetHoldLevels(z,zoneStart,hold1,hold2,hold3);

   double areaHigh = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double areaLow  = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double bid = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(bid <= 0.0) bid = SymbolInfoDouble(_Symbol,SYMBOL_LAST);
   if(bid <= 0.0) bid = zoneStart;

   int pips = ExtractPipsFromStatus(statusText);
   bool isLoss = (StringFind(statusText,"Cut Loss") >= 0 || StringFind(statusText,"CUT LOSS") >= 0);
   int runningPips = (isLoss ? -pips : pips);
   if(isNewZone || StringFind(statusText,"Harga Masuk Zona Entry") >= 0)
      runningPips = 0;

   int maxPips = WebsiteBestPipsForBaseKey(baseKey,(runningPips > 0 ? runningPips : 0));
   string progress = WebsiteProgressCodeFromStatus(statusText);
   string status = WebsiteZoneStatusFromStatus(statusText,isNewZone);
   string visibility = TrimText(Website_Visibility);
   StringToLower(visibility);
   if(visibility != "public") visibility = "member";

   string json = "{";
   json += "\"id_zona\":\"" + WebsiteJsonEscape(WebsiteStableZoneId(z,baseKey)) + "\",";
   json += "\"pair\":\"" + WebsiteJsonEscape(_Symbol) + "\",";
   json += "\"timeframe\":\"" + WebsiteJsonEscape(TimeframeToText(_Period)) + "\",";
   json += "\"zone_status\":\"" + status + "\",";
   json += "\"event_type\":\"" + WebsiteEventTypeFromStatus(statusText,isNewZone) + "\",";
   json += "\"scenario\":\"" + ZoneSignalText(z) + "\",";
   json += "\"jenis_zona\":\"" + (z.dir == 1 ? "Demand" : "Supply") + "\",";
   json += "\"area_high\":" + WebsiteNumber(areaHigh) + ",";
   json += "\"area_low\":" + WebsiteNumber(areaLow) + ",";
   json += "\"target_kajian_1\":" + WebsiteNumber(tp1) + ",";
   json += "\"target_kajian_2\":" + WebsiteNumber(tp2) + ",";
   json += "\"target_kajian_3\":" + WebsiteNumber(tp3) + ",";
   json += "\"target_lanjutan_1\":" + WebsiteNumber(hold1) + ",";
   json += "\"target_lanjutan_2\":" + WebsiteNumber(hold2) + ",";
   json += "\"target_lanjutan_3\":" + WebsiteNumber(hold3) + ",";
   json += "\"invalidasi\":" + WebsiteNumber(cutLoss) + ",";
   json += "\"current_price\":" + WebsiteNumber(bid) + ",";
   json += "\"progress_update\":\"" + progress + "\",";
   json += "\"running_pips\":" + WebsiteInt(runningPips) + ",";
   json += "\"max_running_pips\":" + WebsiteInt(maxPips) + ",";
   json += "\"visibility\":\"" + WebsiteJsonEscape(visibility) + "\",";
   // Step24AS: NEW_ZONE harus tetap dikirim saat zona terkunci. Sentuhan cepat tidak boleh membatalkan event Fresh awal.
   json += "\"is_fresh_candidate\":" + (isNewZone ? "true" : (z.wasTouched ? "false" : "true")) + ",";
   json += "\"touched_before_website_send\":" + (isNewZone ? "false" : (WebsiteZoneHasHistoricalTouch(z) ? "true" : "false")) + ",";
   json += "\"zone_was_touched\":" + (z.wasTouched ? "true" : "false") + ",";
   json += "\"distance_to_price\":" + WebsiteNumber(ZoneDistanceFromCurrentPrice(z)) + ",";
   json += "\"distance_pips\":" + WebsiteInt(WebsiteZoneDistancePips(z)) + ",";
   json += "\"distance_point\":" + WebsiteNumber(WebsiteZoneDistancePointValue(z)) + ",";
   json += "\"fresh_priority_pips_limit\":" + WebsiteInt(Website_Fresh_Priority_Distance_Pips) + ",";
   json += "\"fresh_priority_eligible\":" + (WebsiteZoneWithinFreshPriorityDistance(z) ? "true" : "false") + ",";
   json += "\"source\":\"ea\"";
   json += "}";
   return(json);
}


string WebsiteUrlEncode(const string value)
{
   string out = "";
   int len = StringLen(value);
   for(int i=0; i<len; i++)
   {
      ushort c = StringGetCharacter(value,i);
      bool safe = ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~');
      if(safe)
         out += ShortToString(c);
      else
         out += StringFormat("%%%02X",(int)c);
   }
   return(out);
}

bool WebsitePostJsonFallbackGet(const string json)
{
   string url = Website_API_URL;
   if(StringFind(url,"?") >= 0)
      url += "&ea_fallback=1&payload=" + WebsiteUrlEncode(json);
   else
      url += "?ea_fallback=1&payload=" + WebsiteUrlEncode(json);

   char post[];
   char result[];
   string resultHeaders = "";
   string headers = "X-Kamar-EA-Token: " + Website_API_Token + "\r\n";

   ResetLastError();
   if(Website_Debug_Log)
      Print("Website fallback GET URL aktif: ",url);

   int response = WebRequest("GET",url,headers,Website_Timeout_MS,post,result,resultHeaders);
   string responseText = CharArrayToString(result,0,-1,CP_UTF8);

   if(response == -1)
   {
      int err = GetLastError();
      Print("Website fallback GET gagal. Error=",err," | Izinkan URL di MT5: ",Website_API_URL);
      return(false);
   }

   if(Website_Debug_Log)
      Print("Website fallback GET HTTP ",response," | response=",responseText);

   return(response >= 200 && response < 300 && StringFind(responseText,"\"accepted\":true") >= 0);
}

bool WebsitePostJson(const string json)
{
   if(!Website_Update_ON)
      return(false);
   if(TrimText(Website_API_URL) == "" || TrimText(Website_API_Token) == "")
   {
      if(Website_Debug_Log)
         Print("Website update gagal: Website_API_URL atau Website_API_Token masih kosong.");
      return(false);
   }

   char post[];
   char result[];
   string resultHeaders = "";
   string headers = "Content-Type: application/json\r\nX-Kamar-EA-Token: " + Website_API_Token + "\r\n";

   StringToCharArray(json,post,0,StringLen(json),CP_UTF8);
   if(Website_Debug_Log)
      Print("Website POST URL aktif: ",Website_API_URL," | json_len=",StringLen(json));
   ResetLastError();
   int response = WebRequest("POST",Website_API_URL,headers,Website_Timeout_MS,post,result,resultHeaders);
   string responseText = CharArrayToString(result,0,-1,CP_UTF8);

   if(response == -1)
   {
      int err = GetLastError();
      Print("Website update gagal. Error=",err," | Izinkan URL di MT5: Tools > Options > Expert Advisors > Allow WebRequest: ",Website_API_URL);
      return(false);
   }

   if(Website_Debug_Log)
      Print("Website update HTTP ",response," | response=",responseText);

   // Beberapa environment MT5/Vercel dapat mengubah POST menjadi GET karena redirect/domain handling.
   // Jika API hanya membalas pesan status aktif, kirim ulang melalui fallback GET berisi payload terstruktur.
   if(response >= 200 && response < 300 && StringFind(responseText,"API Kamar Study aktif") >= 0)
   {
      if(Website_Debug_Log)
         Print("Website update terdeteksi hanya mengenai endpoint aktif. Mencoba fallback payload GET...");
      return(WebsitePostJsonFallbackGet(json));
   }

   return(response >= 200 && response < 300 && (StringFind(responseText,"\"accepted\":true") >= 0 || StringFind(responseText,"\"ok\":true") >= 0));
}


bool WebsiteSendConnectivityTest()
{
   if(!Website_Update_ON)
   {
      if(Website_Debug_Log)
         Print("Website test tidak dikirim: Website_Update_ON=false.");
      return(false);
   }

   double bid = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(bid <= 0)
      bid = SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   if(bid <= 0)
      bid = iClose(_Symbol,_Period,0);
   if(bid <= 0)
   {
      if(Website_Debug_Log)
         Print("Website test gagal: harga symbol belum tersedia.");
      return(false);
   }

   string prefix = TrimText(Website_Zone_ID_Prefix);
   if(prefix == "") prefix = "KM-TEST";
   prefix = WebsiteSafePart(prefix);

   string tf = TimeframeToText(_Period);
   string id = prefix + "/TEST/" + WebsiteSafePart(_Symbol) + "/" + WebsiteSafePart(tf) + "-" + IntegerToString((int)TimeCurrent());
   double areaHigh = bid;
   double areaLow = bid - (100.0 * _Point);
   double tp1 = bid + (100.0 * _Point);
   double tp2 = bid + (200.0 * _Point);
   double tp3 = bid + (300.0 * _Point);
   double inv = areaLow - (100.0 * _Point);

   string visibility = TrimText(Website_Visibility);
   StringToLower(visibility);
   if(visibility != "public") visibility = "member";

   string json = "{";
   json += "\"api_token\":\"" + WebsiteJsonEscape(Website_API_Token) + "\",";
   json += "\"id_zona\":\"" + WebsiteJsonEscape(id) + "\",";
   json += "\"pair\":\"" + WebsiteJsonEscape(_Symbol) + "\",";
   json += "\"timeframe\":\"" + WebsiteJsonEscape(tf) + "\",";
   json += "\"jenis_zona\":\"Demand\",";
   json += "\"scenario\":\"BUY\",";
   json += "\"zone_status\":\"FRESH\",";
   json += "\"event_type\":\"NEW_ZONE\",";
   json += "\"progress_update\":\"\",";
   json += "\"progress_label\":\"\",";
   json += "\"area_high\":" + WebsiteNumber(areaHigh) + ",";
   json += "\"area_low\":" + WebsiteNumber(areaLow) + ",";
   json += "\"target_kajian_1\":" + WebsiteNumber(tp1) + ",";
   json += "\"target_kajian_2\":" + WebsiteNumber(tp2) + ",";
   json += "\"target_kajian_3\":" + WebsiteNumber(tp3) + ",";
   json += "\"invalidasi\":" + WebsiteNumber(inv) + ",";
   json += "\"current_price\":" + WebsiteNumber(bid) + ",";
   json += "\"running_pips\":0,";
   json += "\"max_running_pips\":0,";
   json += "\"visibility\":\"" + WebsiteJsonEscape(visibility) + "\",";
   json += "\"source\":\"ea_test\"";
   json += "}";

   if(Website_Debug_Log)
      Print("Website test dikirim. ID Zona: ",id," | Visibility: ",visibility);
   return(WebsitePostJson(json));
}


bool WebsiteZoneHasHistoricalTouch(const ZoneState &z)
{
   double zoneHigh = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double zoneLow  = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));

   double bid = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double last = SymbolInfoDouble(_Symbol,SYMBOL_LAST);
   if((bid >= zoneLow && bid <= zoneHigh) || (ask >= zoneLow && ask <= zoneHigh) || (last >= zoneLow && last <= zoneHigh))
      return(true);

   int bars = iBars(_Symbol,_Period);
   int maxBars = Website_Fresh_History_Check_Bars;
   if(maxBars <= 0) maxBars = 3000;
   if(maxBars > bars-1) maxBars = bars-1;

   for(int i=1; i<=maxBars; i++)
   {
      datetime bt = iTime(_Symbol,_Period,i);
      if(bt <= 0)
         continue;
      if(bt <= z.bornTime)
         break;

      double hi = iHigh(_Symbol,_Period,i);
      double lo = iLow(_Symbol,_Period,i);
      if(hi >= zoneLow && lo <= zoneHigh)
         return(true);
   }
   return(false);
}

bool WebsiteFreshCandidateAllowed(const ZoneState &z,const string baseKey)
{
   // Step24AS: guard Fresh tidak boleh terlalu kuat.
   // NEW_ZONE dikirim saat zona terkunci; jarak/touch cepat hanya jadi metadata dan prioritas tampilan, bukan alasan blok.
   if(!z.stillActive)
   {
      if(Website_Debug_Log)
         Print("Website NEW_ZONE skip: zona sudah tidak aktif/invalid: ",baseKey);
      return(false);
   }
   if(Website_Debug_Log)
   {
      Print("Website Fresh zone locked: ",baseKey,
            " | wasTouched=",(z.wasTouched ? "true" : "false"),
            " | historicalTouch=",(WebsiteZoneHasHistoricalTouch(z) ? "true" : "false"),
            " | distancePips=",WebsiteZoneDistancePips(z),
            " | priority<=",Website_Fresh_Priority_Distance_Pips,
            " | priorityEligible=",(WebsiteZoneWithinFreshPriorityDistance(z) ? "true" : "false"));
   }
   return(true);
}

void WebsiteSendPriceHeartbeatIfDue()
{
   if(!Website_Update_ON || !Website_Send_Progress)
      return;
   if(Website_Price_Heartbeat_Seconds <= 0)
      return;
   datetime now = TimeCurrent();
   if(g_websiteLastHeartbeatTime > 0 && (now - g_websiteLastHeartbeatTime) < Website_Price_Heartbeat_Seconds)
      return;

   g_websiteLastHeartbeatTime = now;
   int sent = 0;
   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!g_zones[i].stillActive)
         continue;
      string baseKey = ZoneBaseKey(g_zones[i]);
      if(!WebsiteZoneAlreadySent(baseKey))
         continue;
      string payload = WebsiteBuildPayload(g_zones[i],baseKey,"Website Price Heartbeat",false);
      if(WebsitePostJson(payload))
         sent++;
      if(sent >= 5)
         break;
   }
   if(Website_Debug_Log && sent > 0)
      Print("Website heartbeat harga terkirim: ",sent," zona | interval=",Website_Price_Heartbeat_Seconds," detik");
}

bool SendWebsiteZoneNew(const ZoneState &z,const string baseKey)
{
   if(!Website_Update_ON || !Website_Send_New_Zone)
      return(false);
   if(WebsiteZoneAlreadySent(baseKey))
   {
      if(Website_Debug_Log)
         Print("Website Fresh skip: duplicate id/baseKey: ",baseKey);
      return(false);
   }
   if(!WebsiteFreshCandidateAllowed(z,baseKey))
      return(false);

   string payload = WebsiteBuildPayload(z,baseKey,"",true);
   bool ok = WebsitePostJson(payload);
   if(ok)
   {
      MarkWebsiteZoneSent(baseKey);
      if(Website_Debug_Log)
         Print("Website Fresh sent to website: ",baseKey," | distancePips=",WebsiteZoneDistancePips(z));

      // Jika harga sudah masuk sangat cepat, kirim fase Active setelah Fresh agar admin/riwayat tetap punya urutan event yang benar.
      if(z.wasTouched)
      {
         string activePayload = WebsiteBuildPayload(z,baseKey,"Harga Masuk Zona Entry",false);
         bool activeOk = WebsitePostJson(activePayload);
         if(Website_Debug_Log)
            Print("Website Active sent after quick Fresh: ",baseKey," | ok=",(activeOk ? "true" : "false"));
      }
   }
   return(ok);
}

bool SendWebsiteZoneUpdate(const ZoneState &z,const string baseKey,const string statusText)
{
   if(!Website_Update_ON || !Website_Send_Progress)
      return(false);
   if(StringFind(statusText,"Zona Berubah Highrisk") >= 0)
      return(false);

   if((StringFind(statusText,"Cut Loss") >= 0 || StringFind(statusText,"CUT LOSS") >= 0) && WebsiteInvalidationLockedLocal(baseKey))
   {
      if(Website_Debug_Log)
         Print("Website invalidasi/loss tidak dikirim karena signal sudah pernah profit minimal 20 pips atau HIT TP1: ",baseKey);
      return(false);
   }

   // Jika zona belum pernah terkirim ke website, kirim data awal dulu agar update tidak menjadi data kosong.
   if(!WebsiteZoneAlreadySent(baseKey))
      SendWebsiteZoneNew(z,baseKey);

   string payload = WebsiteBuildPayload(z,baseKey,statusText,false);
   return(WebsitePostJson(payload));
}

//====================================================================
// TELEGRAM + PUSH
//====================================================================
int TimeStringToMinutes(const string timeText)
{
   string parts[];
   int n = StringSplit(timeText,':',parts);
   if(n < 2)
      return(-1);

   int hh = (int)StringToInteger(parts[0]);
   int mm = (int)StringToInteger(parts[1]);

   if(hh < 0 || hh > 23 || mm < 0 || mm > 59)
      return(-1);

   return(hh * 60 + mm);
}

bool TimeFilterAllows(const bool useFilter,const string startTime,const string endTime)
{
   if(!useFilter)
      return(true);

   int startMin = TimeStringToMinutes(startTime);
   int endMin   = TimeStringToMinutes(endTime);

   if(startMin < 0 || endMin < 0)
   {
      Print("Format jam filter salah. Gunakan format HH:MM. Start=",startTime," End=",endTime);
      return(false);
   }

   MqlDateTime now;
   TimeToStruct(TimeWIBNow(),now); // semua filter waktu dibaca sebagai WIB jika Report_Use_WIB_Time=true
   int currentMin = now.hour * 60 + now.min;

   if(startMin <= endMin)
      return(currentMin >= startMin && currentMin <= endMin);

   // Untuk jadwal melewati tengah malam, contoh 22:00 - 02:00.
   return(currentMin >= startMin || currentMin <= endMin);
}

bool TelegramTargetAllowed(const bool enabled,const string chatId,const bool useTimeFilter,const string startTime,const string endTime)
{
   if(!Telegram_ON || !enabled)
      return(false);

   if(Bot_Token == "")
   {
      Print("Telegram alert gagal: Bot Token masih kosong.");
      return(false);
   }

   if(chatId == "")
      return(false);

   if(!TimeFilterAllows(useTimeFilter,startTime,endTime))
      return(false);

   return(true);
}

void AppendRawBytes(char &dst[],const char &src[])
{
   int oldSize = ArraySize(dst);
   int addSize = ArraySize(src);
   if(addSize <= 0)
      return;

   ArrayResize(dst,oldSize + addSize);
   for(int i=0; i<addSize; i++)
      dst[oldSize + i] = src[i];
}

void AppendStringBytes(char &dst[],const string text)
{
   char bytes[];
   int copied = StringToCharArray(text,bytes,0,WHOLE_ARRAY,CP_UTF8);
   if(copied > 0)
      ArrayResize(bytes,copied-1);
   AppendRawBytes(dst,bytes);
}

string ScreenshotFullPath(const string fileName)
{
   return(TerminalInfoString(TERMINAL_DATA_PATH) + "\\MQL5\\Files\\" + fileName);
}

bool WaitForFileReady(const string fileName,const int maxWaitMs,int &fileSize)
{
   fileSize = 0;
   int waited = 0;
   int step = 100;
   if(maxWaitMs <= 0)
      step = 0;

   while(true)
   {
      ResetLastError();
      int handle = FileOpen(fileName,FILE_READ|FILE_BIN);
      if(handle != INVALID_HANDLE)
      {
         fileSize = (int)FileSize(handle);
         FileClose(handle);
         if(fileSize > 0)
            return(true);
      }

      if(waited >= maxWaitMs)
         break;

      Sleep(step);
      waited += step;
   }

   return(false);
}

bool ReadBinaryFile(const string fileName,char &fileData[],int &fileSize)
{
   fileSize = 0;
   ResetLastError();
   int handle = FileOpen(fileName,FILE_READ|FILE_BIN);
   if(handle == INVALID_HANDLE)
   {
      Print("Screenshot Telegram gagal: file tidak bisa dibuka. File=",fileName," Path=",ScreenshotFullPath(fileName)," Error=",GetLastError());
      return(false);
   }

   fileSize = (int)FileSize(handle);
   if(fileSize <= 0)
   {
      FileClose(handle);
      Print("Screenshot Telegram gagal: file kosong. File=",fileName," Path=",ScreenshotFullPath(fileName));
      return(false);
   }

   ArrayResize(fileData,fileSize);
   int readBytes = (int)FileReadArray(handle,fileData,0,fileSize);
   FileClose(handle);

   if(readBytes != fileSize)
   {
      Print("Screenshot Telegram gagal: byte file tidak lengkap. File=",fileName," Read=",readBytes," Size=",fileSize," Error=",GetLastError());
      return(false);
   }

   return(true);
}

bool SendTelegramPhotoFileTo(const string chatId,
                             const string fileName,
                             const string caption,
                             const int replyToMessageId,
                             int &outMessageId,
                             const int topicId=0)
{
   outMessageId = 0;

   if(Bot_Token == "" || chatId == "" || fileName == "")
      return(false);

   char fileData[];
   int fileSize = 0;
   if(!ReadBinaryFile(fileName,fileData,fileSize))
      return(false);

   string boundary = "----KSAFormBoundary" + IntegerToString((int)GetTickCount()) + IntegerToString(MathRand());
   char post[];
   ArrayResize(post,0);

   AppendStringBytes(post,"--" + boundary + "\r\n");
   AppendStringBytes(post,"Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n" + chatId + "\r\n");

   if(topicId > 0)
   {
      AppendStringBytes(post,"--" + boundary + "\r\n");
      AppendStringBytes(post,"Content-Disposition: form-data; name=\"message_thread_id\"\r\n\r\n" + IntegerToString(topicId) + "\r\n");
   }

   if(replyToMessageId > 0)
   {
      AppendStringBytes(post,"--" + boundary + "\r\n");
      AppendStringBytes(post,"Content-Disposition: form-data; name=\"reply_to_message_id\"\r\n\r\n" + IntegerToString(replyToMessageId) + "\r\n");
   }

   if(caption != "")
   {
      AppendStringBytes(post,"--" + boundary + "\r\n");
      AppendStringBytes(post,"Content-Disposition: form-data; name=\"caption\"\r\n\r\n" + caption + "\r\n");
   }

   AppendStringBytes(post,"--" + boundary + "\r\n");
   AppendStringBytes(post,"Content-Disposition: form-data; name=\"photo\"; filename=\"chart.png\"\r\n");
   AppendStringBytes(post,"Content-Type: image/png\r\n\r\n");
   AppendRawBytes(post,fileData);
   AppendStringBytes(post,"\r\n--" + boundary + "--\r\n");

   string url = "https://api.telegram.org/bot" + Bot_Token + "/sendPhoto";
   string headers = "Content-Type: multipart/form-data; boundary=" + boundary + "\r\n";
   char result[];
   string result_headers;

   int timeout = Screenshot_Upload_Timeout_MS;
   if(timeout < 5000)
      timeout = 5000;

   if(Screenshot_Debug_Log)
      Print("Screenshot upload mulai. ChatID=",chatId," Topic=",topicId," Reply=",replyToMessageId," File=",fileName," Size=",fileSize," PostBytes=",ArraySize(post));

   ResetLastError();
   int response = WebRequest("POST",url,headers,timeout,post,result,result_headers);

   if(response == -1)
   {
      Print("Telegram sendPhoto gagal. Error: ",GetLastError()," | Pastikan URL https://api.telegram.org sudah diizinkan di MT5.");
      return(false);
   }

   string responseText = CharArrayToString(result,0,-1,CP_UTF8);
   if(response != 200)
   {
      Print("Telegram sendPhoto HTTP ",response," | ChatID=",chatId," | Topic=",topicId," | Response=",responseText);
      return(false);
   }

   if(StringFind(responseText,"\"ok\":true") < 0)
   {
      Print("Telegram sendPhoto response bukan ok=true. Response=",responseText);
      return(false);
   }

   outMessageId = ExtractTelegramMessageId(responseText);
   Print("Screenshot Telegram terkirim ke ",chatId," | topic=",topicId," | message_id=",outMessageId);
   return(true);
}

bool SendChartScreenshotToTelegram(const string chatId,
                                   const int topicId,
                                   const string caption,
                                   const int replyToMessageId)
{
   g_lastScreenshotMessageId = 0;

   int width = Screenshot_Width;
   int height = Screenshot_Height;
   if(width < 400)
      width = 400;
   if(height < 300)
      height = 300;

   string fileName = "KSA_Screenshot_" + _Symbol + "_" + TimeframeToText(_Period) + "_" + IntegerToString((int)TimeLocal()) + "_" + IntegerToString((int)GetTickCount()) + ".png";

   // Pastikan area kanan chart tersedia dan semua object terbaru terlihat sebelum screenshot.
   ChartSetInteger(0,CHART_SHIFT,true);
   ChartRedraw(0);
   if(Screenshot_Delay_MS > 0)
      Sleep(Screenshot_Delay_MS);
   ChartRedraw(0);

   ResetLastError();
   bool shotOk = ChartScreenShot(0,fileName,width,height,ALIGN_RIGHT);
   if(!shotOk)
   {
      int err = GetLastError();
      Print("ChartScreenShot gagal. Error=",err," File=",fileName," Path=",ScreenshotFullPath(fileName));
      if(Screenshot_Send_Error_Message)
      {
         int tmp=0;
         SendTelegramMessageTo(chatId,"⚠️ Screenshot gagal dibuat. Error ChartScreenShot: " + IntegerToString(err),replyToMessageId,tmp,topicId);
      }
      return(false);
   }

   int readySize = 0;
   if(!WaitForFileReady(fileName,Screenshot_File_Wait_MS,readySize))
   {
      Print("Screenshot gagal: file belum siap / ukuran 0 setelah tunggu. File=",fileName," Path=",ScreenshotFullPath(fileName)," WaitMS=",Screenshot_File_Wait_MS);
      if(Screenshot_Send_Error_Message)
      {
         int tmp=0;
         SendTelegramMessageTo(chatId,"⚠️ Screenshot gagal dikirim: file screenshot belum siap.",replyToMessageId,tmp,topicId);
      }
      return(false);
   }

   if(Screenshot_Debug_Log)
      Print("Screenshot file siap. File=",fileName," Path=",ScreenshotFullPath(fileName)," Size=",readySize," bytes");

   bool sent = false;
   int photoMessageId = 0;
   int retries = Screenshot_Retry_Count;
   if(retries < 1)
      retries = 1;
   if(retries > 5)
      retries = 5;

   for(int attempt=1; attempt<=retries; attempt++)
   {
      if(attempt > 1)
         Sleep(700);

      if(Screenshot_Debug_Log)
         Print("Screenshot upload attempt ",attempt,"/",retries);

      sent = SendTelegramPhotoFileTo(chatId,fileName,caption,replyToMessageId,photoMessageId,topicId);
      if(sent)
         break;
   }

   if(sent)
   {
      g_lastScreenshotMessageId = photoMessageId;
      FileDelete(fileName);
      return(true);
   }

   Print("Screenshot Telegram tetap gagal setelah ",retries," percobaan. File=",fileName," Path=",ScreenshotFullPath(fileName));

   if(Screenshot_Send_Error_Message)
   {
      int tmp=0;
      SendTelegramMessageTo(chatId,"⚠️ Signal terkirim, tetapi screenshot gagal di-upload. Cek tab Experts MT5.",replyToMessageId,tmp,topicId);
   }

   if(!Screenshot_Keep_File_On_Fail)
      FileDelete(fileName);

   return(false);
}


bool TelegramPostUrlEncoded(const string method,const string body,string &responseText,const int timeout=7000)
{
   responseText = "";
   if(Bot_Token == "") return(false);
   string url = "https://api.telegram.org/bot" + Bot_Token + "/" + method;
   char post[];
   char result[];
   string result_headers;
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   int copied = StringToCharArray(body,post,0,WHOLE_ARRAY,CP_UTF8);
   if(copied > 0)
      ArrayResize(post,copied-1);

   ResetLastError();
   int response = WebRequest("POST",url,headers,timeout,post,result,result_headers);
   if(response == -1)
   {
      Print("Telegram ",method," gagal. Error: ",GetLastError());
      return(false);
   }
   responseText = CharArrayToString(result,0,-1,CP_UTF8);
   if(response != 200 || StringFind(responseText,"\"ok\":true") < 0)
   {
      Print("Telegram ",method," HTTP ",response," | ",responseText);
      return(false);
   }
   return(true);
}

bool DeleteTelegramMessage(const string chatId,const int messageId)
{
   if(chatId == "" || messageId <= 0) return(false);
   string resp;
   string body = "chat_id=" + UrlEncodeUtf8(chatId) + "&message_id=" + IntegerToString(messageId);
   return(TelegramPostUrlEncoded("deleteMessage",body,resp,7000));
}

void ProcessPendingDeletes()
{
   int processed = 0;
   int maxPerCycle = Max_Delete_Per_Cycle;
   if(maxPerCycle <= 0)
      maxPerCycle = 1;

   for(int i=ArraySize(g_pendingDeleteMessages)-1; i>=0; i--)
   {
      if(processed >= maxPerCycle)
         break;

      if(g_pendingDeleteMessages[i].dueTime > 0 && TimeCurrent() < g_pendingDeleteMessages[i].dueTime)
         continue;

      processed++;
      if(DeleteTelegramMessage(g_pendingDeleteMessages[i].chatIdRaw,g_pendingDeleteMessages[i].messageId))
      {
         ArrayRemove(g_pendingDeleteMessages,i,1);
         continue;
      }

      g_pendingDeleteMessages[i].attempts++;
      int retrySec = Delete_Retry_Seconds;
      if(retrySec < 1) retrySec = 1;
      g_pendingDeleteMessages[i].dueTime = TimeCurrent() + retrySec;

      // Jika retry dimatikan, tetap coba beberapa kali lalu buang agar queue tidak membesar.
      if(!Retry_Delete_Old_Update && g_pendingDeleteMessages[i].attempts >= 3)
         ArrayRemove(g_pendingDeleteMessages,i,1);
   }
}

bool EditTelegramMessageText(const string chatId,const int messageId,const string text)
{
   if(chatId == "" || messageId <= 0) return(false);
   string resp;
   string body = "chat_id=" + UrlEncodeUtf8(chatId) +
                 "&message_id=" + IntegerToString(messageId) +
                 "&text=" + UrlEncodeUtf8(text) +
                 "&disable_web_page_preview=true";
   return(TelegramPostUrlEncoded("editMessageText",body,resp,7000));
}

bool EditTelegramMessageCaption(const string chatId,const int messageId,const string caption)
{
   if(chatId == "" || messageId <= 0) return(false);
   string resp;
   string body = "chat_id=" + UrlEncodeUtf8(chatId) +
                 "&message_id=" + IntegerToString(messageId) +
                 "&caption=" + UrlEncodeUtf8(caption);
   return(TelegramPostUrlEncoded("editMessageCaption",body,resp,7000));
}


string TelegramResultLineForTarget(const string baseKey,const string targetKey)
{
   for(int i=0; i<ArraySize(g_reportEntries); i++)
   {
      if(g_reportEntries[i].baseKey==baseKey && g_reportEntries[i].chatId==targetKey)
      {
         if(g_reportEntries[i].bestRank < 0)
            return("Hasil Kajian : " + ApplyFormatTokens(ChannelResultTemplate(targetKey,false),"Invalidasi",MathAbs(g_reportEntries[i].bestPips)));
         if(g_reportEntries[i].bestRank > 0)
            return("Hasil Kajian : " + ApplyFormatTokens(ChannelResultTemplate(targetKey,true),"Pergerakan",g_reportEntries[i].bestPips));
         return("");
      }
   }
   return("");
}

string TelegramDisplayZoneType(const ZoneState &z,const ZoneLifecycleState &lc,const string resultLine)
{
   if(resultLine != "" || lc.entryActive || lc.touchedAfterAlert || lc.entryTouchAlertSent ||
      lc.lastRunningStep > 0 || lc.postTp3RunningStep > 0 || lc.tp1Sent || lc.tp2Sent || lc.tp3Sent ||
      lc.hold1Sent || lc.hold2Sent || lc.hold3Sent || lc.rrOneToOneSent || lc.cutLossSent)
      return("Aktif");
   return(z.wasTouched ? "Remaining" : "Fresh");
}

string ZoneMessageTextWithDone(const ZoneState &z,const string messageTitle,const string zoneId,const ZoneLifecycleState &lc,const bool markCutLoss,const string resultLine)
{
   string signalText = (z.dir==1 ? "BUY" : "SELL");
   string priceZone;
   double zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);
   double hold1,hold2,hold3;
   GetHoldLevels(z,zoneStart,hold1,hold2,hold3);

   string tp1Line = "Target Kajian 1: " + DoubleToString(tp1,_Digits) + (lc.tp1Sent ? " ✅ Tercapai" : "");
   string tp2Line = "Target Kajian 2: " + DoubleToString(tp2,_Digits) + (lc.tp2Sent ? " ✅ Tercapai" : "");
   string tp3Line = "Target Kajian 3: " + DoubleToString(tp3,_Digits) + (lc.tp3Sent ? " ✅ Tercapai" : "");
   string h1Line  = "Target Lanjutan 1: " + DoubleToString(hold1,_Digits) + (lc.hold1Sent ? " ✅ Tercapai" : "");
   string h2Line  = "Target Lanjutan 2: " + DoubleToString(hold2,_Digits) + (lc.hold2Sent ? " ✅ Tercapai" : "");
   string h3Line  = "Target Lanjutan 3: " + DoubleToString(hold3,_Digits) + (lc.hold3Sent ? " ✅ Tercapai" : "");
   string clLine  = "Invalidasi Skenario: " + DoubleToString(cutLoss,_Digits) + (markCutLoss ? " ❌ Terinvalidasi" : "");

   string disclaimer = ChannelDisclaimerTextByTitle(messageTitle);
   return(messageTitle + "\n\n" +
          "Pair: " + _Symbol + " - " + TimeframeToText(_Period) + "\n" +
          "Jenis Zona: " + TelegramDisplayZoneType(z,lc,resultLine) + "\n\n" +
          "Skenario: " + signalText + "\n" +
          "Area Kajian: " + priceZone + "\n" +
          tp1Line + "\n" +
          tp2Line + "\n" +
          tp3Line + "\n" +
          h1Line + "\n" +
          h2Line + "\n" +
          h3Line + "\n" +
          clLine + "\n\n" +
          "ID Zona: " + zoneId + (resultLine != "" ? "\n" + resultLine : "") + (disclaimer != "" ? "\n\n" + disclaimer : ""));
}

string ExtractChatIdFromTargetKey(const string targetKey)
{
   int p = StringFind(targetKey,"#topic=");
   if(p < 0) return(targetKey);
   return(StringSubstr(targetKey,0,p));
}

void EditOriginalSignalMessageForTarget(const ZoneState &z,const string baseKey,const string targetKey,const int sentIndex,const string statusText)
{
   if(!Edit_Original_Message) return;
   int lifeIdx = FindLifecycleIndex(baseKey);
   if(lifeIdx < 0) return;
   bool markCutLoss = (StringFind(statusText,"Cut Loss")>=0 || StringFind(statusText,"CUT LOSS")>=0) && !g_zoneLifecycle[lifeIdx].tp1Sent;
   string title = g_sentZoneMessages[sentIndex].messageTitle;
   if(title == "") title = Channel_1_Message_Title;
   string resultLine = TelegramResultLineForTarget(baseKey,targetKey);
   string edited = ZoneMessageTextWithDone(z,title,g_sentZoneMessages[sentIndex].zoneId,g_zoneLifecycle[lifeIdx],markCutLoss,resultLine);
   if(g_sentZoneMessages[sentIndex].isPhotoMessage)
      EditTelegramMessageCaption(ExtractChatIdFromTargetKey(targetKey),g_sentZoneMessages[sentIndex].messageId,edited);
   else
      EditTelegramMessageText(ExtractChatIdFromTargetKey(targetKey),g_sentZoneMessages[sentIndex].messageId,edited);
}

bool SendTelegramMessageTo(const string chatId,const string message,const int replyToMessageId,int &outMessageId,const int topicId=0)
{
   outMessageId = 0;

   if(Bot_Token == "" || chatId == "")
      return(false);

   string url = "https://api.telegram.org/bot" + Bot_Token + "/sendMessage";
   string body = "chat_id=" + UrlEncodeUtf8(chatId) +
                 "&text=" + UrlEncodeUtf8(message) +
                 "&disable_web_page_preview=true";

   if(topicId > 0)
      body += "&message_thread_id=" + IntegerToString(topicId);

   if(replyToMessageId > 0)
      body += "&reply_to_message_id=" + IntegerToString(replyToMessageId);

   char post[];
   char result[];
   string result_headers;
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";

   int copied = StringToCharArray(body,post,0,WHOLE_ARRAY,CP_UTF8);
   if(copied > 0)
      ArrayResize(post,copied-1);

   ResetLastError();
   int response = WebRequest("POST",url,headers,7000,post,result,result_headers);

   if(response == -1)
   {
      Print("Telegram WebRequest gagal. Error: ",GetLastError()," | Pastikan URL https://api.telegram.org sudah diizinkan di MT5.");
      return(false);
   }

   string responseText = CharArrayToString(result,0,-1,CP_UTF8);
   if(response != 200)
   {
      Print("Telegram response HTTP ",response," | ChatID=",chatId," | ",responseText);
      return(false);
   }

   outMessageId = ExtractTelegramMessageId(responseText);
   Print("Telegram alert terkirim ke ",chatId," | message_id=",outMessageId," | ",responseText);
   return(true);
}

bool SendTelegramMessageTo(const string chatId,const string message,const int topicId)
{
   int dummyMessageId = 0;
   return(SendTelegramMessageTo(chatId,message,0,dummyMessageId,topicId));
}

bool SendTelegramMessageTo(const string chatId,const string message)
{
   int dummyMessageId = 0;
   return(SendTelegramMessageTo(chatId,message,0,dummyMessageId,0));
}


void SendTelegramToAllTargets(const string message1,const string message2,const string message3,const string message4,const string message5)
{
   if(TelegramTargetAllowed(Channel_1_Enable,Channel_1_ID_or_Username,Channel_1_Use_Time_Filter,Channel_1_Start_Time,Channel_1_End_Time))
      SendTelegramMessageTo(Channel_1_ID_or_Username,message1,Channel_1_Topic_ID);

   if(TelegramTargetAllowed(Channel_2_Enable,Channel_2_ID_or_Username,Channel_2_Use_Time_Filter,Channel_2_Start_Time,Channel_2_End_Time))
      SendTelegramMessageTo(Channel_2_ID_or_Username,message2,Channel_2_Topic_ID);

   if(TelegramTargetAllowed(Channel_3_Enable,Channel_3_ID_or_Username,Channel_3_Use_Time_Filter,Channel_3_Start_Time,Channel_3_End_Time))
      SendTelegramMessageTo(Channel_3_ID_or_Username,message3,Channel_3_Topic_ID);

   if(TelegramTargetAllowed(Channel_4_Enable,Channel_4_ID_or_Username,Channel_4_Use_Time_Filter,Channel_4_Start_Time,Channel_4_End_Time))
      SendTelegramMessageTo(Channel_4_ID_or_Username,message4,Channel_4_Topic_ID);

   if(TelegramTargetAllowed(Channel_5_Enable,Channel_5_ID_or_Username,Channel_5_Use_Time_Filter,Channel_5_Start_Time,Channel_5_End_Time))
      SendTelegramMessageTo(Channel_5_ID_or_Username,message5,Channel_5_Topic_ID);
}

bool SendZoneToTargetIfAllowed(const ZoneState &z,
                               const string baseKey,
                               const bool enabled,
                               const string chatId,
                               const int topicId,
                               const string messageTitle,
                               const string zoneIdPrefix,
                               const bool useTimeFilter,
                               const string startTime,
                               const string endTime)
{
   if(!TelegramTargetAllowed(enabled,chatId,useTimeFilter,startTime,endTime))
      return(false);

   string targetKey = TelegramTargetKey(chatId,topicId);

   // Anti duplicate utama: 1 zona hanya boleh punya 1 posting awal per channel/grup/topic.
   // Ini mencegah zona yang sama terkirim lagi saat scan awal, pindah TF, atau rebuild candle.
   if(ZoneAlreadySentToTarget(baseKey,targetKey))
      return(false);

   string zoneId = BuildZoneId(z,messageTitle,zoneIdPrefix);
   string zoneMessage = ZoneMessageText(z,messageTitle,zoneId);
   int messageId = 0;
   bool ok = false;
   bool sentAsPhoto = false;

   // Mode paling rapi: 1 postingan berisi FOTO + caption signal lengkap.
   // Kalau upload foto gagal dan Send_Text_Signal=true, EA fallback ke teks agar signal tetap aman terkirim.
   if(Screenshot_ON && Send_Screenshot_With_Signal && Signal_Photo_With_Full_Caption)
   {
      DrawTradeLinesForSingleZone(z);
      string caption = (Screenshot_Use_Caption ? zoneMessage : "");
      ok = SendChartScreenshotToTelegram(chatId,topicId,caption,0);
      if(ok)
      {
         messageId = g_lastScreenshotMessageId;
         sentAsPhoto = true;
      }
   }

   if(!ok && (Send_Text_Signal || Screenshot_Force_Text_Fallback))
   {
      ok = SendTelegramMessageTo(chatId,zoneMessage,0,messageId,topicId);
      if(ok && Screenshot_ON && Send_Screenshot_With_Signal && !Signal_Photo_With_Full_Caption)
      {
         DrawTradeLinesForSingleZone(z);
         string caption = (Screenshot_Use_Caption ? ZoneScreenshotCaption(z,messageTitle,zoneId) : "");
         int replyId = (Screenshot_As_Reply_To_Signal ? messageId : 0);
         SendChartScreenshotToTelegram(chatId,topicId,caption,replyId);
      }
   }

   if(ok)
   {
      StoreSentZoneMessage(baseKey,targetKey,zoneId,messageId,sentAsPhoto,messageTitle);
      // Pastikan garis bantu TP/CL/Hold tetap digambar untuk zona yang sudah resmi terkirim.
      DrawTradeLinesForSingleZone(z);
      ChartRedraw(0);
      // v1.81: setiap alert awal memulai lifecycle bersih.
      // Khusus Remaining, sentuhan lama sebelum alert tidak dipakai. Update baru dihitung
      // hanya setelah harga masuk ulang ke zona setelah posting Telegram terkirim.
      ResetLifecycleForNewAlert(baseKey,z,true);
      StoreReportEntry(baseKey,targetKey,z);
      return(true);
   }
   return(false);
}

bool SendZoneToAllTargets(const ZoneState &z,const string alertType)
{
   string baseKey = ZoneBaseKey(z);
   bool sent = false;

   if(SendZoneToTargetIfAllowed(z,baseKey,Channel_1_Enable,Channel_1_ID_or_Username,Channel_1_Topic_ID,Channel_1_Message_Title,Channel_1_Zone_ID_Prefix,Channel_1_Use_Time_Filter,Channel_1_Start_Time,Channel_1_End_Time)) sent = true;
   if(SendZoneToTargetIfAllowed(z,baseKey,Channel_2_Enable,Channel_2_ID_or_Username,Channel_2_Topic_ID,Channel_2_Message_Title,Channel_2_Zone_ID_Prefix,Channel_2_Use_Time_Filter,Channel_2_Start_Time,Channel_2_End_Time)) sent = true;
   if(SendZoneToTargetIfAllowed(z,baseKey,Channel_3_Enable,Channel_3_ID_or_Username,Channel_3_Topic_ID,Channel_3_Message_Title,Channel_3_Zone_ID_Prefix,Channel_3_Use_Time_Filter,Channel_3_Start_Time,Channel_3_End_Time)) sent = true;
   if(SendZoneToTargetIfAllowed(z,baseKey,Channel_4_Enable,Channel_4_ID_or_Username,Channel_4_Topic_ID,Channel_4_Message_Title,Channel_4_Zone_ID_Prefix,Channel_4_Use_Time_Filter,Channel_4_Start_Time,Channel_4_End_Time)) sent = true;
   if(SendZoneToTargetIfAllowed(z,baseKey,Channel_5_Enable,Channel_5_ID_or_Username,Channel_5_Topic_ID,Channel_5_Message_Title,Channel_5_Zone_ID_Prefix,Channel_5_Use_Time_Filter,Channel_5_Start_Time,Channel_5_End_Time)) sent = true;

   bool telegramSent = sent;
   if(SendWebsiteZoneNew(z,baseKey))
   {
      sent = true;
      if(!telegramSent)
      {
         DrawTradeLinesForSingleZone(z);
         ChartRedraw(0);
         ResetLifecycleForNewAlert(baseKey,z,true);
         StoreReportEntry(baseKey,"WEBSITE",z);
      }
   }

   if(Enable_MT5_Push_Notification)
   {
      string pushZoneId = BuildZoneId(z,Channel_1_Message_Title,Channel_1_Zone_ID_Prefix);
      ResetLastError();
      bool pushOk = SendNotification(ZoneMessageText(z,Channel_1_Message_Title,pushZoneId));
      if(pushOk) sent = true;
      if(!pushOk)
         Print("Push notification gagal. Error: ",GetLastError());
   }

   return(sent);
}

bool SendTelegramZoneReply(const string chatId,const int topicId,const string zoneKey,const string updateMessage)
{
   string targetKey = TelegramTargetKey(chatId,topicId);
   int replyMessageId = FindSentZoneMessageId(zoneKey,targetKey);
   int newMessageId = 0;
   return(SendTelegramMessageTo(chatId,updateMessage,replyMessageId,newMessageId,topicId));
}


void SendTestMessageToAllTargets()
{
   string base = "\n\n" +
                 "Pair: " + _Symbol + "\n" +
                 "Timeframe: " + TimeframeToText(_Period) + "\n" +
                 "Skenario: TEST" + "\n" +
                 "Info: MT5 EA connected";

   SendTelegramToAllTargets(
      Channel_1_Message_Title + base,
      Channel_2_Message_Title + base,
      Channel_3_Message_Title + base,
      Channel_4_Message_Title + base,
      Channel_5_Message_Title + base
   );

   if(Enable_MT5_Push_Notification)
      SendNotification(Channel_1_Message_Title + base);
}

string ZoneMessageText(const ZoneState &z,const string messageTitle,const string zoneId)
{
   string signalText = (z.dir==1 ? "BUY" : "SELL");

   string priceZone;
   double zoneStart;
   double zoneEnd;
   double tp1;
   double tp2;
   double tp3;
   double cutLoss;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);

   string disclaimer = ChannelDisclaimerTextByTitle(messageTitle);
   return(messageTitle + "\n\n" +
          "Pair: " + _Symbol + " - " + TimeframeToText(_Period) + "\n" +
          "Jenis Zona: " + (z.wasTouched ? "Remaining" : "Fresh") + "\n\n" +
          "Skenario: " + signalText + "\n" +
          "Area Kajian: " + priceZone + "\n" +
          "Target Kajian 1: " + DoubleToString(tp1,_Digits) + "\n" +
          "Target Kajian 2: " + DoubleToString(tp2,_Digits) + "\n" +
          "Target Kajian 3: " + DoubleToString(tp3,_Digits) + "\n" +
          "Target Lanjutan 1: " + DoubleToString((z.dir==1 ? zoneStart + Hold_1_Points*_Point : zoneStart - Hold_1_Points*_Point),_Digits) + "\n" +
          "Target Lanjutan 2: " + DoubleToString((z.dir==1 ? zoneStart + Hold_2_Points*_Point : zoneStart - Hold_2_Points*_Point),_Digits) + "\n" +
          "Target Lanjutan 3: " + DoubleToString((z.dir==1 ? zoneStart + Hold_3_Points*_Point : zoneStart - Hold_3_Points*_Point),_Digits) + "\n" +
          "Invalidasi Skenario: " + DoubleToString(cutLoss,_Digits) + "\n\n" +
          "ID Zona: " + zoneId + (disclaimer != "" ? "\n\n" + disclaimer : ""));
}

string ZoneScreenshotCaption(const ZoneState &z,const string messageTitle,const string zoneId)
{
   // v1.62: Label TP/CL/Hold dibuat lebih jelas di atas line untuk BUY dan di bawah line untuk SELL.
   // Semua screenshot signal memakai format signal lengkap agar tidak double dan lebih rapi.
   return(ZoneMessageText(z,messageTitle,zoneId));
}


bool ZoneDirectionAllowed(const ZoneState &z)
{
   if(z.dir == 1 && !Send_Buy_Signal)
      return(false);
   if(z.dir == -1 && !Send_Sell_Signal)
      return(false);
   return(true);
}

bool ZoneMatchesAlertFilter(const ZoneState &z)
{
   if(!z.stillActive)
      return(false);

   // v1.81: filter alert harus benar-benar mengikuti pilihan user.
   // Fresh_Zones_Only     -> hanya zona yang belum disentuh harga.
   // Remaining_Zones_Only -> hanya zona yang sudah disentuh, masih aktif, belum break/invalid.
   // All_Active_Zones     -> fresh + remaining.
   // Penting: zona remaining boleh dikirim sebagai alert jika user memang memilih Remaining.
   // Setelah terkirim, lifecycle tetap di-reset dan update baru dihitung hanya setelah harga masuk ulang.
   if(Zone_Filter == All_Active_Zones)
      return(true);
   if(Zone_Filter == Fresh_Zones_Only)
      return(!z.wasTouched);
   if(Zone_Filter == Remaining_Zones_Only)
      return(z.wasTouched);
   return(true);
}

bool ZoneIsLockedVisible(const ZoneState &z)
{
   if(!z.stillActive)
      return(false);

   string baseKey = ZoneBaseKey(z);

   // Zona yang sudah dikirim ke Telegram harus tetap tampil sampai invalid/break,
   // meskipun statusnya berubah Fresh -> Remaining atau melewati batas Max_Chart_Zones.
   if(ZoneHasOriginalTelegramPost(baseKey))
      return(true);

   int lifeIdx = FindLifecycleIndex(baseKey);
   if(lifeIdx >= 0)
   {
      if(g_zoneLifecycle[lifeIdx].entryActive ||
         g_zoneLifecycle[lifeIdx].tickTouchConfirmed ||
         g_zoneLifecycle[lifeIdx].touchedAfterAlert)
         return(true);
   }

   return(false);
}

bool ZoneMatchesChartFilter(const ZoneState &z)
{
   if(!z.stillActive)
      return(false);

   // v1.74: zona yang sudah aktif / sudah dikirim alert tidak boleh hilang dari chart
   // hanya karena filter Fresh/Remaining. Filter hanya berlaku untuk zona kandidat
   // yang belum aktif dan belum dikirim Telegram.
   if(ZoneIsLockedVisible(z))
      return(true);

   if(Chart_Zone_Filter == All_Active_Zones)
      return(true);
   if(Chart_Zone_Filter == Fresh_Zones_Only)
      return(!z.wasTouched);
   if(Chart_Zone_Filter == Remaining_Zones_Only)
      return(z.wasTouched);
   return(true);
}

string ZoneAlertKey(const ZoneState &z,const string alertType)
{
   string signalText = (z.dir==1 ? "BUY" : "SELL");
   string priceZone = DoubleToString(z.top,_Digits) + "-" + DoubleToString(z.bottom,_Digits);
   return(_Symbol + "|" + TimeframeToText(_Period) + "|" + alertType + "|" +
          signalText + "|" + IntegerToString((int)z.bornTime) + "|" + priceZone);
}

bool AlertKeyWasSent(const string key)
{
   for(int i=0; i<ArraySize(g_sentAlertKeys); i++)
   {
      if(g_sentAlertKeys[i] == key)
         return(true);
   }
   return(false);
}

void MarkAlertKeyAsSent(const string key)
{
   int n = ArraySize(g_sentAlertKeys);
   ArrayResize(g_sentAlertKeys,n+1);
   g_sentAlertKeys[n] = key;

   if(ArraySize(g_sentAlertKeys) > 500)
   {
      for(int i=0; i<ArraySize(g_sentAlertKeys)-1; i++)
         g_sentAlertKeys[i] = g_sentAlertKeys[i+1];
      ArrayResize(g_sentAlertKeys,ArraySize(g_sentAlertKeys)-1);
   }
}

bool SendFilteredZoneAlert(const ZoneState &z,const string alertType)
{
   if(!ZoneDirectionAllowed(z))
      return(false);
   if(!ZoneMatchesAlertFilter(z))
      return(false);
   if(!ZoneWithinMaxAlertDistance(z))
      return(false);

   // Duplicate posting dikunci per channel/grup di SendZoneToTargetIfAllowed()
   // memakai ZoneBaseKey. Jadi zona yang sama tidak akan terkirim 2 kali
   // walaupun dipanggil dari NEW_ZONE, SCAN, atau BECAME_REMAINING.
   return(SendZoneToAllTargets(z,alertType));
}

void SendStartTestMessage()
{
   if(g_startTestSent || !Test_On_Start)
      return;

   g_startTestSent = true;
   SendTestMessageToAllTargets();
}


double ZoneDistanceFromCurrentPrice(const ZoneState &z)
{
   double currentPrice = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(currentPrice <= 0.0)
      currentPrice = iClose(_Symbol,_Period,0);

   double highZone = MathMax(z.top,z.bottom);
   double lowZone  = MathMin(z.top,z.bottom);

   if(currentPrice >= lowZone && currentPrice <= highZone)
      return(0.0);

   double d1 = MathAbs(currentPrice - highZone);
   double d2 = MathAbs(currentPrice - lowZone);
   return(MathMin(d1,d2));
}


int WebsiteZoneDistancePips(const ZoneState &z)
{
   double distance = ZoneDistanceFromCurrentPrice(z);
   if(_Point <= 0.0)
      return(0);
   return((int)MathRound(distance / _Point));
}

double WebsiteZoneDistancePointValue(const ZoneState &z)
{
   // Kamar website rule: 10 pips EA = 1.00 Point website.
   return(((double)WebsiteZoneDistancePips(z)) / 10.0);
}

bool WebsiteZoneWithinFreshPriorityDistance(const ZoneState &z)
{
   if(Website_Fresh_Priority_Distance_Pips <= 0)
      return(true);
   return(WebsiteZoneDistancePips(z) <= Website_Fresh_Priority_Distance_Pips);
}

double MaxAlertDistancePrice()
{
   if(!Use_Distance_Filter || Max_Distance_Points <= 0)
      return(0.0);

   // Input sudah dalam POINT. Contoh: 1000 point = 100 pips jika Points_Per_Pip=10.
   return((double)Max_Distance_Points * _Point);
}

bool ZoneWithinMaxAlertDistance(const ZoneState &z)
{
   double maxDistance = MaxAlertDistancePrice();
   if(maxDistance <= 0.0)
      return(true);

   return(ZoneDistanceFromCurrentPrice(z) <= maxDistance + (_Point * 0.5));
}

void SortZoneIndexesByNearestPrice(int &indexes[],double &distances[])
{
   int n = ArraySize(indexes);
   for(int i=0; i<n-1; i++)
   {
      int best = i;
      for(int j=i+1; j<n; j++)
      {
         if(distances[j] < distances[best])
            best = j;
         else if(distances[j] == distances[best] && indexes[j] > indexes[best])
            best = j; // jika jarak sama, pilih zona yang lebih baru
      }

      if(best != i)
      {
         int tmpIdx = indexes[i];
         indexes[i] = indexes[best];
         indexes[best] = tmpIdx;

         double tmpDist = distances[i];
         distances[i] = distances[best];
         distances[best] = tmpDist;
      }
   }
}

bool IndexAlreadyInArray(const int value,const int &arr[])
{
   for(int i=0; i<ArraySize(arr); i++)
   {
      if(arr[i] == value)
         return(true);
   }
   return(false);
}

void AppendIndex(int &arr[],const int value)
{
   int n = ArraySize(arr);
   ArrayResize(arr,n+1);
   arr[n] = value;
}

int BuildPrioritizedEligibleZoneIndexes(int &indexes[])
{
   ArrayResize(indexes,0);

   int buyIdx[];
   int sellIdx[];
   double buyDist[];
   double sellDist[];

   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!ZoneEligibleForNewAlertSlot(g_zones[i]))
         continue;

      double d = ZoneDistanceFromCurrentPrice(g_zones[i]);
      double maxDistance = MaxAlertDistancePrice();
      if(maxDistance > 0.0 && d > maxDistance + (_Point * 0.5))
         continue;

      if(g_zones[i].dir == 1)
      {
         int n = ArraySize(buyIdx);
         ArrayResize(buyIdx,n+1);
         ArrayResize(buyDist,n+1);
         buyIdx[n] = i;
         buyDist[n] = d;
      }
      else if(g_zones[i].dir == -1)
      {
         int n = ArraySize(sellIdx);
         ArrayResize(sellIdx,n+1);
         ArrayResize(sellDist,n+1);
         sellIdx[n] = i;
         sellDist[n] = d;
      }
   }

   if(Sort_Alert_Zones_By_Nearest_Price)
   {
      SortZoneIndexesByNearestPrice(buyIdx,buyDist);
      SortZoneIndexesByNearestPrice(sellIdx,sellDist);
   }

   // Prioritas utama: ambil 1 BUY terdekat dan 1 SELL terdekat terlebih dahulu.
   // Setelah itu baru masukkan sisa zona berdasarkan jarak terdekat dari BID.
   if(Prioritize_Buy_And_Sell_Zone)
   {
      if(ArraySize(buyIdx) > 0)
         AppendIndex(indexes,buyIdx[0]);
      if(ArraySize(sellIdx) > 0)
         AppendIndex(indexes,sellIdx[0]);
   }

   int restIdx[];
   double restDist[];
   for(int b=0; b<ArraySize(buyIdx); b++)
   {
      if(IndexAlreadyInArray(buyIdx[b],indexes))
         continue;
      int n = ArraySize(restIdx);
      ArrayResize(restIdx,n+1);
      ArrayResize(restDist,n+1);
      restIdx[n] = buyIdx[b];
      restDist[n] = ZoneDistanceFromCurrentPrice(g_zones[buyIdx[b]]);
   }
   for(int s=0; s<ArraySize(sellIdx); s++)
   {
      if(IndexAlreadyInArray(sellIdx[s],indexes))
         continue;
      int n = ArraySize(restIdx);
      ArrayResize(restIdx,n+1);
      ArrayResize(restDist,n+1);
      restIdx[n] = sellIdx[s];
      restDist[n] = ZoneDistanceFromCurrentPrice(g_zones[sellIdx[s]]);
   }

   if(Sort_Alert_Zones_By_Nearest_Price)
      SortZoneIndexesByNearestPrice(restIdx,restDist);

   for(int r=0; r<ArraySize(restIdx); r++)
      AppendIndex(indexes,restIdx[r]);

   return(ArraySize(indexes));
}


void SendAllSelectedZonesOnStart()
{
   bool contextChanged = (g_lastKnownSymbol != _Symbol || g_lastKnownPeriod != (int)_Period || g_lastKnownFilter != (int)Zone_Filter || g_lastKnownChartFilter != (int)Chart_Zone_Filter);

   if(contextChanged)
   {
      if(Resend_Zones_When_Timeframe_Changed)
      {
         g_startAllZonesSent = false;
         ArrayResize(g_knownZoneBaseKeys,0);
         g_knownZonesInitialized = false;
         ArrayResize(g_initialZoneBaseKeys,0);
         g_initialSnapshotReady = false;
         Print("Context berubah. Snapshot zona lama direset untuk ",_Symbol," ",TimeframeToText(_Period)," | AlertFilter: ",(int)Zone_Filter," | ChartFilter: ",(int)Chart_Zone_Filter);
      }
      g_lastKnownSymbol = _Symbol;
      g_lastKnownPeriod = (int)_Period;
      g_lastKnownFilter = (int)Zone_Filter;
      g_lastKnownChartFilter = (int)Chart_Zone_Filter;
   }

   SendQueuedOldZonesByLimit("INITIAL_QUEUE_" + TimeframeToText(_Period));
   g_startAllZonesSent = true;
}

bool AlertBarAllowed(const int barIndex,const int rates_total)
{
   int alertBarIndex = (Send_Alert_After_Candle_Close ? rates_total-2 : rates_total-1);
   return(barIndex == alertBarIndex);
}

void SendZoneAlert(const ZoneState &z,const int barIndex,const int rates_total,const string alertType)
{
   if(!AlertBarAllowed(barIndex,rates_total))
      return;

   // v1.46: zona lama yang sudah ada saat EA dipasang tetap mengikuti limit/antrian.
   // Zona baru setelah snapshot selesai boleh langsung alert. Ini mencegah zona lama
   // bypass limit dari event NEW_ZONE / BECAME_REMAINING.
   if(!g_initialSnapshotReady)
      return;

   if(ZoneIsOldInitial(z))
   {
      SendQueuedOldZonesByLimit(alertType + "_OLD_QUEUE");
      return;
   }

   SendFilteredZoneAlert(z,alertType);
}

//====================================================================
// ZONE LOGIC
//====================================================================
void DeleteZoneByIndex(const int idx)
{
   if(idx<0 || idx>=ArraySize(g_zones))
      return;

   for(int i=idx; i<ArraySize(g_zones)-1; i++)
      g_zones[i] = g_zones[i+1];

   ArrayResize(g_zones,ArraySize(g_zones)-1);
}

void PushZone(ZoneState &z)
{
   int n = ArraySize(g_zones);
   ArrayResize(g_zones,n+1);
   g_zones[n] = z;

   // Jangan hapus zona yang sudah pernah dikirim alert dan masih dipantau.
   // Jika zona terkirim dihapus hanya karena batas Max_Active_Zones, update running/TP/Loss bisa terlewat.
   while(Max_Active_Zones > 0 && ArraySize(g_zones) > Max_Active_Zones)
   {
      int deleteIdx = -1;

      // Prioritas hapus: zona yang belum pernah dikirim alert.
      for(int i=0; i<ArraySize(g_zones); i++)
      {
         string key = ZoneBaseKey(g_zones[i]);
         if(!ZoneAlreadySentToAnyTarget(key))
         {
            deleteIdx = i;
            break;
         }
      }

      // Jika semua zona pernah dikirim, jangan dipaksa hapus agar lifecycle update tetap aman.
      if(deleteIdx < 0)
      {
         if(Debug_Update_Status_Log)
            Print("Max_Active_Zones terlampaui, tetapi semua zona sudah tracking alert. Tidak dihapus agar update tidak terlewat. Total=",ArraySize(g_zones));
         break;
      }

      DeleteZoneByIndex(deleteIdx);
   }
}

bool ZoneBroken(const ZoneState &z,const datetime barTime,const double closePrice)
{
   double zoneTop = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double zoneBottom = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   bool buyBroken  = (z.dir == 1  && barTime > z.bornTime && closePrice < zoneBottom - Break_Point_Price);
   bool sellBroken = (z.dir == -1 && barTime > z.bornTime && closePrice > zoneTop    + Break_Point_Price);
   return(buyBroken || sellBroken);
}

bool ZoneTouched(const ZoneState &z,const datetime barTime,const double highPrice,const double lowPrice)
{
   double zoneTop = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double zoneBottom = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   return(barTime > z.bornTime && highPrice >= zoneBottom && lowPrice <= zoneTop);
}

void UpdateZonesByBar(const int barIndex,const int rates_total,const datetime barTime,const double highPrice,const double lowPrice,const double closePrice)
{
   for(int i=ArraySize(g_zones)-1; i>=0; i--)
   {
      CheckCutLossByClosedCandle(g_zones[i],barIndex,rates_total,closePrice);

      if(Delete_Broken_Zones && ZoneBroken(g_zones[i],barTime,closePrice))
      {
         string brokenKey = ZoneBaseKey(g_zones[i]);

         // v1.76: saat zona yang sudah aktif break/invalid, Cut Loss wajib diproses
         // sebelum zona dihapus. Ini mencegah kasus zona hilang tanpa update Loss.
         CheckCutLossByClosedCandle(g_zones[i],barIndex,rates_total,closePrice);
         ForceCutLossOnInvalid(g_zones[i],closePrice,"zone_break");

         if(Release_Alert_Slot_When_Broken)
            ReleaseZoneAlertSlot(brokenKey);
         Print("Zona break/invalid dan dihapus dari chart/analisis: ",brokenKey," | TF=",TimeframeToText(_Period));
         DeleteZoneByIndex(i);
         continue;
      }

      if(g_zones[i].stillActive)
      {
         // v1.76: zona yang sudah aktif/remaining tidak boleh terus diperpanjang visualnya.
         // rightTime hanya digeser selama zona masih fresh; begitu tersentuh, ujung kanan dikunci
         // pada candle sentuhan pertama, tetapi lifecycle update tetap berjalan sampai invalid.
         if(!g_zones[i].wasTouched)
            g_zones[i].rightTime = barTime;
         bool touchedNow = ZoneTouched(g_zones[i],barTime,highPrice,lowPrice);

         if(touchedNow)
         {
            bool alreadyRemaining = g_zones[i].wasTouched;

            // v1.43: zona yang sudah disentuh TIDAK BOLEH dipotong, disembunyikan,
            // atau dihapus. Zona tetap utuh dan tetap terlihat sampai close candle
            // benar-benar break/invalid. Sentuhan hanya mengubah status Fresh -> Remaining.
            g_zones[i].wasTouched = true;
            g_zones[i].top = ZoneOriginalTop(g_zones[i]);
            g_zones[i].bottom = ZoneOriginalBottom(g_zones[i]);
            if(!alreadyRemaining)
               g_zones[i].rightTime = barTime;

            // v1.80: zona yang sudah aktif/tersentuh harga TIDAK boleh dikirim sebagai alert baru.
            // Sentuhan hanya mengubah status internal Fresh -> Remaining agar update lifecycle tetap jalan.
            // Alert signal hanya untuk zona yang benar-benar masih fresh saat dipilih untuk dikirim.
            continue;
         }
      }
   }
}

bool ZoneArrayContainsBaseKey(const ZoneState &arr[],const string baseKey)
{
   for(int i=0; i<ArraySize(arr); i++)
   {
      if(ZoneBaseKey(arr[i]) == baseKey)
         return(true);
   }
   return(false);
}

bool CurrentZonesContainBaseKey(const string baseKey)
{
   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(ZoneBaseKey(g_zones[i]) == baseKey)
         return(true);
   }
   return(false);
}

void PreserveOldActiveZonesUntilBreak(const ZoneState &oldZones[],const datetime rightTime,const datetime closedBarTime,const double closedPrice)
{
   for(int i=0; i<ArraySize(oldZones); i++)
   {
      ZoneState oldZ = oldZones[i];
      if(!oldZ.stillActive)
         continue;

      string key = ZoneBaseKey(oldZ);
      if(CurrentZonesContainBaseKey(key))
         continue;

      if(Delete_Broken_Zones && ZoneBroken(oldZ,closedBarTime,closedPrice))
      {
         // v1.76: zona preserved yang break juga wajib memproses Cut Loss dulu,
         // bukan hanya hilang dari chart.
         ForceCutLossOnInvalid(oldZ,closedPrice,"preserved_break");
         if(Release_Alert_Slot_When_Broken)
            ReleaseZoneAlertSlot(key);
         if(Debug_Update_Status_Log)
            Print("Preserved zone break/invalid, tidak digambar lagi: ",key);
         continue;
      }

      if(!oldZ.wasTouched)
         oldZ.rightTime = rightTime;
      oldZ.top = ZoneOriginalTop(oldZ);
      oldZ.bottom = ZoneOriginalBottom(oldZ);
      oldZ.stillActive = true;
      PushZone(oldZ);
   }
}


bool DealingCloseDistanceOK(const int dir,const double dealClose,const double baseHigh,const double baseLow)
{
   if(!Use_Dealing_Candle_Filter)
      return(true);

   double minDist = Min_Dealing_Close_Distance_Points * _Point;
   if(minDist <= 0.0)
      return(true);

   if(dir > 0)
      return(dealClose >= baseHigh + minDist);
   if(dir < 0)
      return(dealClose <= baseLow - minDist);
   return(false);
}

void AdjustZoneEndByMotherAndDealing(const int dir,
                                     double &zoneTop,
                                     double &zoneBot,
                                     const double motherOpen,
                                     const double motherHigh,
                                     const double motherLow,
                                     const double dealingHigh,
                                     const double dealingLow)
{
   if(!Use_Zone_End_Adjustment_Filter)
      return;

   double tickSize = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(tickSize<=0.0)
      tickSize = _Point;
   double eps = tickSize * 0.1;

   // Demand zones: RBR + DBR. End zone is the lower boundary.
   // Correct rule:
   // 1) Trigger only if the old end zone is LOWER than Mother Open.
   // 2) If triggered and Mother Open is not Mother Low, widen to Mother Low.
   // 3) After that, if Dealing Low is lower than Mother Low, widen to Dealing Low.
   if(dir > 0)
   {
      bool motherOpenIsNotLow = (MathAbs(motherOpen - motherLow) > eps);
      bool triggerByMotherOpen = (zoneBot < motherOpen - eps);

      if(triggerByMotherOpen && motherOpenIsNotLow)
      {
         if(Adjust_End_To_Mother_Extreme)
            zoneBot = MathMin(zoneBot,motherLow);

         if(Adjust_End_To_Dealing_Extreme && dealingLow < motherLow - eps)
            zoneBot = MathMin(zoneBot,dealingLow);
      }
      return;
   }

   // Supply zones: DBD + RBD. End zone is the upper boundary.
   // Correct rule:
   // 1) Trigger only if the old end zone is HIGHER than Mother Open.
   // 2) If triggered and Mother Open is not Mother High, widen to Mother High.
   // 3) After that, if Dealing High is higher than Mother High, widen to Dealing High.
   if(dir < 0)
   {
      bool motherOpenIsNotHigh = (MathAbs(motherOpen - motherHigh) > eps);
      bool triggerByMotherOpen = (zoneTop > motherOpen + eps);

      if(triggerByMotherOpen && motherOpenIsNotHigh)
      {
         if(Adjust_End_To_Mother_Extreme)
            zoneTop = MathMax(zoneTop,motherHigh);

         if(Adjust_End_To_Dealing_Extreme && dealingHigh > motherHigh + eps)
            zoneTop = MathMax(zoneTop,dealingHigh);
      }
   }
}

void RebuildZones(const int rates_total,const datetime &time[],const double &open[],const double &high[],const double &low[],const double &close[])
{
   ZoneState previousZones[];
   ArrayResize(previousZones,ArraySize(g_zones));
   for(int p=0; p<ArraySize(g_zones); p++)
      previousZones[p] = g_zones[p];

   ArrayResize(g_zones,0);

   bool  activeBase = false;
   double motherHigh = 0.0;
   double motherLow  = 0.0;
   double motherOpen = 0.0;
   int   baseStartIndex = -1;
   double baseHigh = 0.0;
   double baseLow  = 0.0;
   bool  baseHasBull = false;
   bool  baseHasBear = false;
   bool  baseHasDoji = false;

   double tickSize = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(tickSize<=0.0)
      tickSize = _Point;
   double tol = Tolerance_Ticks * tickSize;

   int start = MathMax(1,rates_total - Lookback_Bars);

   // Zona hanya dianggap valid setelah candle dealing sudah close.
   // rates_total-1 adalah candle berjalan, sehingga tidak boleh menjadi dealing candle untuk alert/zona valid.
   int lastBarToProcess = (Require_Closed_Dealing_Candle ? rates_total-2 : rates_total-1);
   if(lastBarToProcess < start)
      return;

   for(int i=start; i<=lastBarToProcess; i++)
   {
      UpdateZonesByBar(i,rates_total,time[i],high[i],low[i],close[i]);
      bool rest = IsRestVsPrev(i,open,high,low,close);

      if(activeBase)
      {
         bool dealBuy  = (Use_Close_For_Dealing ? close[i] > baseHigh : BodyHigh(open[i],close[i]) > baseHigh);
         bool dealSell = (Use_Close_For_Dealing ? close[i] < baseLow  : BodyLow(open[i],close[i])  < baseLow);
         int dealingDir = 0;

         if(dealBuy && !dealSell)
            dealingDir = 1;
         else if(dealSell && !dealBuy)
            dealingDir = -1;
         else if(dealBuy && dealSell)
            dealingDir = (close[i] >= open[i] ? 1 : -1);

         if(dealingDir != 0)
         {
            if(!DealingCloseDistanceOK(dealingDir,close[i],baseHigh,baseLow))
            {
               if(Debug_Update_Status_Log)
                  Print("Zona kandidat ditolak Dealing Candle Filter. TF=",TimeframeToText(_Period)," dir=",dealingDir," close=",DoubleToString(close[i],_Digits)," baseHigh=",DoubleToString(baseHigh,_Digits)," baseLow=",DoubleToString(baseLow,_Digits)," minPoints=",Min_Dealing_Close_Distance_Points);

               activeBase = false;
               motherHigh = 0.0;
               motherLow = 0.0;
               motherOpen = 0.0;
               baseStartIndex = -1;
               baseHigh = 0.0;
               baseLow = 0.0;
               baseHasBull = false;
               baseHasBear = false;
               baseHasDoji = false;
               continue;
            }

            bool validZone = false;
            if(dealingDir == 1)
               validZone = (baseHasBear || (Use_Doji_As_Opposite_Candle && baseHasDoji));
            if(dealingDir == -1)
               validZone = (baseHasBull || (Use_Doji_As_Opposite_Candle && baseHasDoji));

            if(validZone)
            {
               double zoneTop = baseHigh;
               double zoneBot = baseLow;

               if(MathAbs(baseHigh - motherHigh) <= tol)
                  zoneTop = MathMax(zoneTop,motherHigh);
               if(MathAbs(baseLow - motherLow) <= tol)
                  zoneBot = MathMin(zoneBot,motherLow);
               if(MathAbs(baseHigh - high[i]) <= tol)
                  zoneTop = MathMax(zoneTop,high[i]);
               if(MathAbs(baseLow - low[i]) <= tol)
                  zoneBot = MathMin(zoneBot,low[i]);

               AdjustZoneEndByMotherAndDealing(dealingDir,zoneTop,zoneBot,motherOpen,motherHigh,motherLow,high[i],low[i]);

               ZoneState z;
               z.dir = dealingDir;
               z.bornTime = time[i];
               z.leftTime = time[baseStartIndex];
               z.rightTime = time[i];
               z.top = NormalizeDouble(zoneTop,_Digits);
               z.bottom = NormalizeDouble(zoneBot,_Digits);
               z.originalTop = z.top;
               z.originalBottom = z.bottom;
               z.stillActive = true;
               z.wasTouched = false;

               if(z.top > z.bottom)
               {
                  PushZone(z);
                  // v1.80: jangan kirim alert langsung saat zona ditemukan di proses rebuild/history.
                  // EA harus menunggu seluruh chart selesai dianalisis dulu, supaya zona yang ternyata
                  // sudah disentuh/aktif/break pada candle setelahnya tidak salah dikirim sebagai signal baru.
                  // Pengiriman alert dilakukan terpusat oleh SendAllSelectedZonesOnStart()/SendNewlyAppearedValidZones().
               }
            }

            activeBase = false;
            motherHigh = 0.0;
            motherLow = 0.0;
            motherOpen = 0.0;
            baseStartIndex = -1;
            baseHigh = 0.0;
            baseLow = 0.0;
            baseHasBull = false;
            baseHasBear = false;
            baseHasDoji = false;
         }
         else
         {
            baseHigh = MathMax(baseHigh,high[i]);
            baseLow  = MathMin(baseLow,low[i]);
            baseHasBull = (baseHasBull || IsBull(open[i],close[i]));
            baseHasBear = (baseHasBear || IsBear(open[i],close[i]));
            baseHasDoji = (baseHasDoji || IsDoji(open[i],close[i]));
         }
      }
      else
      {
         if(rest)
         {
            activeBase = true;
            motherHigh = high[i-1];
            motherLow  = low[i-1];
            motherOpen = open[i-1];
            baseStartIndex = i;
            baseHigh = high[i];
            baseLow  = low[i];
            baseHasBull = IsBull(open[i],close[i]);
            baseHasBear = IsBear(open[i],close[i]);
            baseHasDoji = IsDoji(open[i],close[i]);
         }
      }
   }

   // v1.43: jangan hilangkan zona lama dari chart hanya karena rebuild/lookback.
   // Zona aktif yang belum break/invalid dipertahankan dan dipanjangkan ke kanan.
   if(rates_total >= 2)
      PreserveOldActiveZonesUntilBreak(previousZones,time[rates_total-1],time[rates_total-2],close[rates_total-2]);
}


//====================================================================
// VISUAL ZONE DRAWING
//====================================================================
string ZoneLabelText(const ZoneState &z)
{
   // v1.68: label visual chart disederhanakan. Status Fresh/Remaining tetap
   // dibaca dari data internal EA dan tetap dipakai untuk filter serta alert Telegram.
   return(z.dir==1 ? "ZONA BUY" : "ZONA SELL");
}


datetime ZoneVisualRightTime(const ZoneState &z)
{
   datetime visualRight = z.rightTime;

   // v1.76: zona yang sudah aktif/tersentuh tidak diperpanjang lagi secara visual.
   // Kotak tetap tampil pada area dan rentang waktunya sampai invalid/break,
   // namun lifecycle update tetap berjalan sampai TP/Hold/CL.
   if(z.wasTouched)
      return(visualRight);

   if(Extend_Zones_To_Right)
   {
      int periodSeconds = PeriodSeconds(_Period);
      if(periodSeconds <= 0)
         periodSeconds = 60;

      int extendBars = Zone_Right_Extend_Bars;
      if(extendBars < 1)
         extendBars = 1;

      datetime currentBarTime = iTime(_Symbol,_Period,0);
      if(currentBarTime <= 0)
         currentBarTime = TimeCurrent();

      // Ujung candle berjalan = currentBarTime + 1 period.
      // Minimal 1 candle lebih kanan dari candle berjalan = + (1 + extendBars) period.
      datetime requiredRight = currentBarTime + (datetime)(periodSeconds * (1 + extendBars));
      if(requiredRight > visualRight)
         visualRight = requiredRight;
   }

   return visualRight;
}


void GetZoneVisualPriceRange(const ZoneState &z,double &visualTop,double &visualBottom)
{
   // v1.46: visual zona SELALU memakai area original selama zona masih aktif.
   // Zona yang sudah disentuh harga tidak boleh mengecil sampai tidak terlihat.
   // Status Fresh/Remaining cukup dibedakan lewat label, bukan dengan menghilangkan kotak zona.
   double zoneHigh = MathMax(ZoneOriginalTop(z),ZoneOriginalBottom(z));
   double zoneLow  = MathMin(ZoneOriginalTop(z),ZoneOriginalBottom(z));

   visualTop = zoneHigh;
   visualBottom = zoneLow;
}

void DrawZoneObject(const int idx)
{
   if(!Show_Zones_On_Chart)
      return;
   if(idx<0 || idx>=ArraySize(g_zones))
      return;

   ZoneState z = g_zones[idx];
   if(!z.stillActive)
      return;
   if(!ZoneMatchesChartFilter(z))
      return;

   datetime drawRightTime = ZoneVisualRightTime(z);
   double drawTop = 0.0;
   double drawBottom = 0.0;
   GetZoneVisualPriceRange(z,drawTop,drawBottom);

   string rectName = KNS_EA_PREFIX + "RECT_" + IntegerToString(idx);
   string textName = KNS_EA_PREFIX + "TEXT_" + IntegerToString(idx);

   color zoneColor = (z.dir==1 ? Buy_Zone_Color : Sell_Zone_Color);

   if(ObjectFind(0,rectName)<0)
   {
      ObjectCreate(0,rectName,OBJ_RECTANGLE,0,z.leftTime,drawTop,drawRightTime,drawBottom);
      ObjectSetInteger(0,rectName,OBJPROP_FILL,true);
      ObjectSetInteger(0,rectName,OBJPROP_WIDTH,1);
      ObjectSetInteger(0,rectName,OBJPROP_STYLE,STYLE_SOLID);
      ObjectSetInteger(0,rectName,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,rectName,OBJPROP_HIDDEN,true);
   }

   ObjectSetInteger(0,rectName,OBJPROP_TIME,0,z.leftTime);
   ObjectSetDouble(0,rectName,OBJPROP_PRICE,0,drawTop);
   ObjectSetInteger(0,rectName,OBJPROP_TIME,1,drawRightTime);
   ObjectSetDouble(0,rectName,OBJPROP_PRICE,1,drawBottom);
   ObjectSetInteger(0,rectName,OBJPROP_COLOR,zoneColor);
   ObjectSetInteger(0,rectName,OBJPROP_BACK,Draw_Zones_Behind_Candle);

   if(!Show_Zone_Label)
   {
      ObjectDelete(0,textName);
      return;
   }

   datetime midTime = (datetime)((long)z.leftTime + ((long)drawRightTime - (long)z.leftTime)/2);
   double midPrice = (drawTop + drawBottom) / 2.0;

   if(ObjectFind(0,textName)<0)
   {
      ObjectCreate(0,textName,OBJ_TEXT,0,midTime,midPrice);
      ObjectSetInteger(0,textName,OBJPROP_ANCHOR,ANCHOR_CENTER);
      ObjectSetInteger(0,textName,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,textName,OBJPROP_HIDDEN,true);
   }

   ObjectSetInteger(0,textName,OBJPROP_TIME,0,midTime);
   ObjectSetDouble(0,textName,OBJPROP_PRICE,0,midPrice);
   ObjectSetString(0,textName,OBJPROP_TEXT,ZoneLabelText(z));
   ObjectSetInteger(0,textName,OBJPROP_COLOR,Zone_Text_Color);
   ObjectSetInteger(0,textName,OBJPROP_FONTSIZE,Zone_Text_Size);
}

void DrawHeaderTitle()
{
   string name = KNS_EA_PREFIX + "HEADER_TITLE";

   if(!Show_Header_Title)
   {
      ObjectDelete(0,name);
      return;
   }

   long chartWidth = 0;
   ChartGetInteger(0,CHART_WIDTH_IN_PIXELS,0,chartWidth);
   int x = (int)(chartWidth / 2);

   if(ObjectFind(0,name)<0)
   {
      ObjectCreate(0,name,OBJ_LABEL,0,0,0);
      ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
      ObjectSetInteger(0,name,OBJPROP_ANCHOR,ANCHOR_CENTER);
      ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,name,OBJPROP_HIDDEN,false);
   }

   ObjectSetInteger(0,name,OBJPROP_XDISTANCE,x);
   ObjectSetInteger(0,name,OBJPROP_YDISTANCE,Header_Title_Y_Offset);
   ObjectSetString(0,name,OBJPROP_TEXT,Header_Title_Text);
   ObjectSetInteger(0,name,OBJPROP_COLOR,Header_Title_Color);
   ObjectSetInteger(0,name,OBJPROP_FONTSIZE,Header_Title_Font_Size);
   ObjectSetString(0,name,OBJPROP_FONT,Header_Title_Font);
   ObjectSetInteger(0,name,OBJPROP_BACK,false);
   ObjectSetInteger(0,name,OBJPROP_ZORDER,1000);
}

void DrawCandleCountdown(const datetime currentBarTime,const double fallbackPrice)
{
   string name = KNS_EA_PREFIX + "CANDLE_COUNTDOWN";

   if(!Show_Candle_Countdown)
   {
      ObjectDelete(0,name);
      return;
   }

   int periodSeconds = PeriodSeconds(_Period);
   if(periodSeconds <= 0)
      periodSeconds = 60;

   datetime nowTime = TimeCurrent();
   int elapsed = (int)(nowTime - currentBarTime);
   int remaining = periodSeconds - elapsed;
   if(remaining < 0)
      remaining = 0;

   int mm = remaining / 60;
   int ss = remaining % 60;
   string text = StringFormat("%02d:%02d",mm,ss);

   double price = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(price <= 0.0)
      price = fallbackPrice;

   datetime textTime = currentBarTime + periodSeconds + Candle_Countdown_X_Offset_Seconds;

   if(ObjectFind(0,name)<0)
   {
      ObjectCreate(0,name,OBJ_TEXT,0,textTime,price);
      ObjectSetInteger(0,name,OBJPROP_ANCHOR,ANCHOR_LEFT);
      ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,name,OBJPROP_HIDDEN,false);
   }

   ObjectSetInteger(0,name,OBJPROP_TIME,0,textTime);
   ObjectSetDouble(0,name,OBJPROP_PRICE,0,price);
   ObjectSetString(0,name,OBJPROP_TEXT,text);
   ObjectSetInteger(0,name,OBJPROP_COLOR,Candle_Countdown_Color);
   ObjectSetInteger(0,name,OBJPROP_FONTSIZE,Candle_Countdown_Font_Size);
   ObjectSetString(0,name,OBJPROP_FONT,Candle_Countdown_Font);
}


double MaxChartDistancePrice()
{
   if(Chart_Max_Distance_Points <= 0)
      return(0.0);
   return((double)Chart_Max_Distance_Points * _Point);
}

bool ZoneWithinMaxChartDistance(const ZoneState &z)
{
   double maxDistance = MaxChartDistancePrice();
   if(maxDistance <= 0.0)
      return(true);
   return(ZoneDistanceFromCurrentPrice(z) <= maxDistance + (_Point * 0.5));
}


int CountNonLockedChartIndexes(const int &indexes[],const int &lockedIdx[])
{
   int count = 0;
   for(int i=0; i<ArraySize(indexes); i++)
   {
      if(!IndexAlreadyInArray(indexes[i],lockedIdx))
         count++;
   }
   return(count);
}

int BuildPrioritizedChartZoneIndexes(int &indexes[])
{
   ArrayResize(indexes,0);

   int lockedIdx[];
   double lockedDist[];
   int buyIdx[];
   int sellIdx[];
   double buyDist[];
   double sellDist[];

   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!g_zones[i].stillActive)
         continue;
      if(!ZoneMatchesChartFilter(g_zones[i]))
         continue;
      if(!ZoneWithinMaxChartDistance(g_zones[i]))
         continue;

      double d = ZoneDistanceFromCurrentPrice(g_zones[i]);
      string baseKey = ZoneBaseKey(g_zones[i]);

      // v1.74: locked-visible zone boleh bypass limit chart, namun tetap harus stillActive.
      // Ini mencegah zona aktif/alerted hilang sebelum break/invalid.
      if(Keep_Alerted_Zones_Visible_Until_Invalid && ZoneIsLockedVisible(g_zones[i]))
      {
         int k = ArraySize(lockedIdx);
         ArrayResize(lockedIdx,k+1);
         ArrayResize(lockedDist,k+1);
         lockedIdx[k] = i;
         lockedDist[k] = d;
         continue;
      }

      if(g_zones[i].dir == 1)
      {
         int n = ArraySize(buyIdx);
         ArrayResize(buyIdx,n+1);
         ArrayResize(buyDist,n+1);
         buyIdx[n] = i;
         buyDist[n] = d;
      }
      else if(g_zones[i].dir == -1)
      {
         int n = ArraySize(sellIdx);
         ArrayResize(sellIdx,n+1);
         ArrayResize(sellDist,n+1);
         sellIdx[n] = i;
         sellDist[n] = d;
      }
   }

   if(Chart_Sort_By_Nearest_Price)
   {
      SortZoneIndexesByNearestPrice(lockedIdx,lockedDist);
      SortZoneIndexesByNearestPrice(buyIdx,buyDist);
      SortZoneIndexesByNearestPrice(sellIdx,sellDist);
   }

   int limit = Max_Chart_Zones;
   if(limit < 0)
      limit = 0;

   // Locked-visible zones are not counted as removable candidates.
   // If there are more locked zones than Max_Chart_Zones, all locked zones still remain visible
   // because they are active alerted zones that must not vanish before invalid/break.
   for(int k=0; k<ArraySize(lockedIdx); k++)
      AppendIndex(indexes,lockedIdx[k]);

   int candidateLimit = limit;
   if(candidateLimit > 0)
      candidateLimit = MathMax(0, candidateLimit - ArraySize(indexes));

   if(Chart_Prioritize_Buy_Sell)
   {
      if(ArraySize(buyIdx) > 0 && (candidateLimit == 0 || CountNonLockedChartIndexes(indexes,lockedIdx) < candidateLimit))
         AppendIndex(indexes,buyIdx[0]);
      if(ArraySize(sellIdx) > 0 && (candidateLimit == 0 || CountNonLockedChartIndexes(indexes,lockedIdx) < candidateLimit))
         AppendIndex(indexes,sellIdx[0]);
   }

   int restIdx[];
   double restDist[];

   for(int b=0; b<ArraySize(buyIdx); b++)
   {
      if(IndexAlreadyInArray(buyIdx[b],indexes))
         continue;
      int n = ArraySize(restIdx);
      ArrayResize(restIdx,n+1);
      ArrayResize(restDist,n+1);
      restIdx[n] = buyIdx[b];
      restDist[n] = ZoneDistanceFromCurrentPrice(g_zones[buyIdx[b]]);
   }

   for(int s=0; s<ArraySize(sellIdx); s++)
   {
      if(IndexAlreadyInArray(sellIdx[s],indexes))
         continue;
      int n = ArraySize(restIdx);
      ArrayResize(restIdx,n+1);
      ArrayResize(restDist,n+1);
      restIdx[n] = sellIdx[s];
      restDist[n] = ZoneDistanceFromCurrentPrice(g_zones[sellIdx[s]]);
   }

   if(Chart_Sort_By_Nearest_Price)
      SortZoneIndexesByNearestPrice(restIdx,restDist);

   for(int r=0; r<ArraySize(restIdx); r++)
   {
      if(candidateLimit > 0 && CountNonLockedChartIndexes(indexes,lockedIdx) >= candidateLimit)
         break;
      AppendIndex(indexes,restIdx[r]);
   }

   return(ArraySize(indexes));
}



string SafeObjectPart(const string raw)
{
   string s = raw;
   StringReplace(s,"|","_");
   StringReplace(s,":","_");
   StringReplace(s,".","_");
   StringReplace(s,"/","_");
   StringReplace(s," ","_");
   StringReplace(s,"-","_");
   return(s);
}

// v1.65: Nama object line/label harus pendek.
// Pada MT5, nama object yang terlalu panjang bisa membuat object text gagal dibuat,
// sementara garisnya masih terlihat. Karena itu line helper memakai hash pendek.
string ShortObjectKey(const string raw)
{
   uint h = 2166136261;
   int n = StringLen(raw);
   for(int i=0; i<n; i++)
   {
      ushort ch = StringGetCharacter(raw,i);
      h = (h ^ ch) * 16777619;
   }
   return(IntegerToString((int)h));
}

void DeleteTradeLineObjectsOnly()
{
   int total = ObjectsTotal(0,-1,-1);
   for(int i=total-1; i>=0; i--)
   {
      string name = ObjectName(0,i,-1,-1);
      if(StartsWith(name,KNS_EA_PREFIX + "LINE_"))
         ObjectDelete(0,name);
   }
}

void DrawTradeHLine(const string name,const double price,const string label,const color clr)
{
   if(ObjectFind(0,name)<0)
      ObjectCreate(0,name,OBJ_HLINE,0,0,price);
   ObjectSetDouble(0,name,OBJPROP_PRICE,price);
   ObjectSetInteger(0,name,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,name,OBJPROP_STYLE,STYLE_DOT);
   ObjectSetInteger(0,name,OBJPROP_WIDTH,Trade_Line_Width);
   ObjectSetInteger(0,name,OBJPROP_BACK,false);
   ObjectSetString(0,name,OBJPROP_TEXT,label);
}

void DrawTradeLineLabel(const string name,const double linePrice,const string label,const color clr,const int dir)
{
   if(!Show_Trade_Line_Labels)
   {
      ObjectDelete(0,name);
      return;
   }

   // v1.68: label dibuat sebagai OBJ_LABEL berbasis pixel agar selalu berada
   // di sisi kanan chart. Ini lebih stabil untuk screenshot dan tetap terlihat
   // walaupun chart digeser. SELL berada di atas line, BUY berada di bawah line.
   long chartWidth = 0;
   ChartGetInteger(0,CHART_WIDTH_IN_PIXELS,0,chartWidth);
   if(chartWidth <= 0)
      chartWidth = 900;

   datetime refTime = iTime(_Symbol,_Period,0);
   if(refTime <= 0)
      refTime = TimeCurrent();

   int px = 0;
   int py = 0;
   bool converted = ChartTimePriceToXY(0,0,refTime,linePrice,px,py);
   if(!converted)
   {
      // Fallback lama berbasis harga jika konversi pixel gagal.
      int sec = PeriodSeconds(_Period);
      if(sec <= 0) sec = 60;
      int xbars = Trade_Line_Label_X_Bars;
      if(xbars < 0) xbars = 0;
      datetime labelTime = refTime + (datetime)(sec * xbars);
      int offsetPoints = Trade_Line_Label_Offset_Points;
      if(offsetPoints < 1) offsetPoints = 1;
      double offset = offsetPoints * _Point;
      // SELL di atas, BUY di bawah.
      double labelPrice = (dir == -1 ? linePrice + offset : linePrice - offset);
      bool createdText = true;
      if(ObjectFind(0,name)<0)
         createdText = ObjectCreate(0,name,OBJ_TEXT,0,labelTime,labelPrice);
      if(!createdText)
      {
         Print("Trade line label create failed: ",name," | err=",GetLastError()," | text=",label);
         return;
      }
      ObjectMove(0,name,0,labelTime,labelPrice);
      ObjectSetString(0,name,OBJPROP_TEXT,label);
      ObjectSetInteger(0,name,OBJPROP_COLOR,clr);
      ObjectSetInteger(0,name,OBJPROP_FONTSIZE,Trade_Line_Label_Font_Size);
      ObjectSetString(0,name,OBJPROP_FONT,Trade_Line_Label_Font);
      ObjectSetInteger(0,name,OBJPROP_ANCHOR,(dir == -1 ? ANCHOR_LEFT_LOWER : ANCHOR_LEFT_UPPER));
      ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,name,OBJPROP_HIDDEN,false);
      ObjectSetInteger(0,name,OBJPROP_BACK,false);
      ObjectSetInteger(0,name,OBJPROP_ZORDER,10000);
      return;
   }

   int rightPad = Trade_Line_Label_Right_Pixels;
   if(rightPad < 20) rightPad = 20;
   int yPad = Trade_Line_Label_Y_Pixels;
   if(yPad < 0) yPad = 0;

   int labelX = (int)chartWidth - rightPad;
   if(labelX < 0) labelX = 0;

   // SELL di atas garis: y lebih kecil. BUY di bawah garis: y lebih besar.
   int labelY = (dir == -1 ? py - yPad - Trade_Line_Label_Font_Size : py + yPad);
   if(labelY < 0) labelY = 0;

   bool created = true;
   if(ObjectFind(0,name)<0)
      created = ObjectCreate(0,name,OBJ_LABEL,0,0,0);

   if(!created)
   {
      Print("Trade line label create failed: ",name," | err=",GetLastError()," | text=",label);
      return;
   }

   ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,name,OBJPROP_XDISTANCE,labelX);
   ObjectSetInteger(0,name,OBJPROP_YDISTANCE,labelY);
   ObjectSetString(0,name,OBJPROP_TEXT,label);
   ObjectSetInteger(0,name,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,name,OBJPROP_FONTSIZE,Trade_Line_Label_Font_Size);
   ObjectSetString(0,name,OBJPROP_FONT,Trade_Line_Label_Font);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_SELECTED,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,false);
   ObjectSetInteger(0,name,OBJPROP_ANCHOR,ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0,name,OBJPROP_BACK,false);
   ObjectSetInteger(0,name,OBJPROP_ZORDER,10000);
}

void DrawTradeLevel(const string baseName,const double price,const string label,const color clr,const int dir)
{
   DrawTradeHLine(baseName,price,label,clr);
   DrawTradeLineLabel(baseName + "_TXT",price,label,clr,dir);
}

bool TradeLinesStillNeeded(const string baseKey)
{
   int li = FindLifecycleIndex(baseKey);
   if(li < 0)
      return(true);
   if(g_zoneLifecycle[li].cutLossSent)
      return(false);
   if(g_zoneLifecycle[li].tp1Sent && g_zoneLifecycle[li].tp2Sent && g_zoneLifecycle[li].tp3Sent)
      return(false);
   return(true);
}

string TradeLevelLabel(const string levelName,const double price)
{
   // v1.66: jangan hilangkan angka level. Teks harus membedakan TP 1/2/3,
   // Hold 1/2, dan Cut Loss secara jelas di chart.
   string prefix = levelName;
   if(StringFind(levelName,"Hold") == 0)
      prefix = "Hold" + StringSubstr(levelName,4);
   if(StringFind(levelName,"Cut Loss") == 0 || StringFind(levelName,"CL") == 0)
      prefix = "Cut Loss";

   return(prefix + ": " + DoubleToString(price,_Digits));
}


void DrawTradeLinesForSingleZone(const ZoneState &z)
{
   if(!Show_TP_CL_Hold_Lines)
      return;

   if(!z.stillActive)
      return;

   double zoneStart,zoneEnd,tp1,tp2,tp3,cl;
   string priceZone;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cl,priceZone);
   double hold1,hold2,hold3;
   GetHoldLevels(z,zoneStart,hold1,hold2,hold3);
   string safe = ShortObjectKey(ZoneBaseKey(z));

   if(Show_Zone_Boundary_Lines)
   {
      // Garis bantu batas zona dibuat hitam agar screenshot tetap jelas
      // walaupun rectangle zona belum sempat terlihat penuh.
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_ZONE_START_"+safe,zoneStart,TradeLevelLabel("Zona Awal",zoneStart),Zone_Boundary_Line_Color,z.dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_ZONE_END_"+safe,zoneEnd,TradeLevelLabel("Zona Akhir",zoneEnd),Zone_Boundary_Line_Color,z.dir);
   }

   DrawTradeLevel(KNS_EA_PREFIX+"LINE_TP1_"+safe,tp1,TradeLevelLabel("TP 1",tp1),TP_Line_Color,z.dir);
   DrawTradeLevel(KNS_EA_PREFIX+"LINE_TP2_"+safe,tp2,TradeLevelLabel("TP 2",tp2),TP_Line_Color,z.dir);
   DrawTradeLevel(KNS_EA_PREFIX+"LINE_TP3_"+safe,tp3,TradeLevelLabel("TP 3",tp3),TP_Line_Color,z.dir);
   DrawTradeLevel(KNS_EA_PREFIX+"LINE_HOLD1_"+safe,hold1,TradeLevelLabel("Hold 1",hold1),Hold_Line_Color,z.dir);
   DrawTradeLevel(KNS_EA_PREFIX+"LINE_HOLD2_"+safe,hold2,TradeLevelLabel("Hold 2",hold2),Hold_Line_Color,z.dir);
   DrawTradeLevel(KNS_EA_PREFIX+"LINE_HOLD3_"+safe,hold3,TradeLevelLabel("Hold 3",hold3),Hold_Line_Color,z.dir);
   DrawTradeLevel(KNS_EA_PREFIX+"LINE_CL_"+safe,cl,TradeLevelLabel("Cut Loss",cl),CL_Line_Color,z.dir);
   ChartRedraw(0);
}

void DrawTradeLinesForAlertedZones()
{
   DeleteTradeLineObjectsOnly();
   if(!Show_TP_CL_Hold_Lines)
      return;

   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!g_zones[i].stillActive)
         continue;
      string baseKey = ZoneBaseKey(g_zones[i]);
      if(!ZoneHasOriginalTelegramPost(baseKey))
         continue;
      if(!TradeLinesStillNeeded(baseKey))
         continue;

      double zoneStart,zoneEnd,tp1,tp2,tp3,cl;
      string priceZone;
      GetZoneTradeLevels(g_zones[i],zoneStart,zoneEnd,tp1,tp2,tp3,cl,priceZone);
      double hold1,hold2,hold3;
      GetHoldLevels(g_zones[i],zoneStart,hold1,hold2,hold3);
      string safe = ShortObjectKey(baseKey);
      if(Show_Zone_Boundary_Lines)
      {
         DrawTradeLevel(KNS_EA_PREFIX+"LINE_ZONE_START_"+safe,zoneStart,TradeLevelLabel("Zona Awal",zoneStart),Zone_Boundary_Line_Color,g_zones[i].dir);
         DrawTradeLevel(KNS_EA_PREFIX+"LINE_ZONE_END_"+safe,zoneEnd,TradeLevelLabel("Zona Akhir",zoneEnd),Zone_Boundary_Line_Color,g_zones[i].dir);
      }
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_TP1_"+safe,tp1,TradeLevelLabel("TP 1",tp1),TP_Line_Color,g_zones[i].dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_TP2_"+safe,tp2,TradeLevelLabel("TP 2",tp2),TP_Line_Color,g_zones[i].dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_TP3_"+safe,tp3,TradeLevelLabel("TP 3",tp3),TP_Line_Color,g_zones[i].dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_HOLD1_"+safe,hold1,TradeLevelLabel("Hold 1",hold1),Hold_Line_Color,g_zones[i].dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_HOLD2_"+safe,hold2,TradeLevelLabel("Hold 2",hold2),Hold_Line_Color,g_zones[i].dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_HOLD3_"+safe,hold3,TradeLevelLabel("Hold 3",hold3),Hold_Line_Color,g_zones[i].dir);
      DrawTradeLevel(KNS_EA_PREFIX+"LINE_CL_"+safe,cl,TradeLevelLabel("Cut Loss",cl),CL_Line_Color,g_zones[i].dir);
   }
}

void DrawAllZoneObjects()
{
   if(!Show_Zones_On_Chart)
   {
      DeleteAllOwnObjects();
      return;
   }

   // Bersihkan objek zona setiap redraw agar saat filter diganti
   // Fresh <-> Remaining, objek lama tidak tertinggal dan objek baru tidak tertimpa index lama.
   DeleteZoneVisualObjectsOnly();

   int chartIndexes[];
   int visibleCount = BuildPrioritizedChartZoneIndexes(chartIndexes);

   for(int n=0; n<ArraySize(chartIndexes); n++)
      DrawZoneObject(chartIndexes[n]);

   DrawTradeLinesForAlertedZones();
   DrawHeaderTitle();
   ChartRedraw(0);

   if(Debug_Update_Status_Log)
      Print("Draw zona selesai. ChartFilter=",(int)Chart_Zone_Filter," | Visible=",visibleCount," | TotalZones=",ArraySize(g_zones)," | MaxChart=",Max_Chart_Zones," | ChartMaxDist=",Chart_Max_Distance_Points," | TF=",TimeframeToText(_Period));
}


//====================================================================
// ZONE LIFECYCLE UPDATE LOGIC
//====================================================================


bool KnownZoneBaseKey(const string baseKey)
{
   for(int i=0; i<ArraySize(g_knownZoneBaseKeys); i++)
   {
      if(g_knownZoneBaseKeys[i] == baseKey)
         return(true);
   }
   return(false);
}

void MarkKnownZoneBaseKey(const string baseKey)
{
   if(KnownZoneBaseKey(baseKey))
      return;

   int n = ArraySize(g_knownZoneBaseKeys);
   ArrayResize(g_knownZoneBaseKeys,n+1);
   g_knownZoneBaseKeys[n] = baseKey;

   if(ArraySize(g_knownZoneBaseKeys) > 1000)
   {
      for(int i=0; i<ArraySize(g_knownZoneBaseKeys)-1; i++)
         g_knownZoneBaseKeys[i] = g_knownZoneBaseKeys[i+1];
      ArrayResize(g_knownZoneBaseKeys,ArraySize(g_knownZoneBaseKeys)-1);
   }
}

void MarkAllCurrentZonesAsKnown()
{
   for(int i=0; i<ArraySize(g_zones); i++)
      MarkKnownZoneBaseKey(ZoneBaseKey(g_zones[i]));
}


//====================================================================
// v1.42 FINAL - OLD ZONE QUEUE VS NEW ZONE DIRECT ALERT
//====================================================================
bool InitialZoneBaseKey(const string baseKey)
{
   for(int i=0; i<ArraySize(g_initialZoneBaseKeys); i++)
   {
      if(g_initialZoneBaseKeys[i] == baseKey)
         return(true);
   }
   return(false);
}

void MarkInitialZoneBaseKey(const string baseKey)
{
   if(InitialZoneBaseKey(baseKey))
      return;

   int n = ArraySize(g_initialZoneBaseKeys);
   ArrayResize(g_initialZoneBaseKeys,n+1);
   g_initialZoneBaseKeys[n] = baseKey;
}

void CaptureInitialZoneSnapshot()
{
   if(g_initialSnapshotReady)
      return;

   ArrayResize(g_initialZoneBaseKeys,0);
   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(g_zones[i].stillActive)
         MarkInitialZoneBaseKey(ZoneBaseKey(g_zones[i]));
   }

   g_initialSnapshotReady = true;
   Print("Initial zone snapshot dibuat. Zona lama=",ArraySize(g_initialZoneBaseKeys)," | TF=",TimeframeToText(_Period));
}

bool ZoneIsOldInitial(const ZoneState &z)
{
   return(InitialZoneBaseKey(ZoneBaseKey(z)));
}

int AlertSlotLimit()
{
   // Limit hanya untuk zona lama yang sudah ada saat EA dipasang.
   // 0 = tidak dibatasi.
   if(Max_Zones_Per_Scan > 0)
      return(Max_Zones_Per_Scan);
   return(0);
}

void ReleaseZoneAlertSlot(const string baseKey)
{
   int idx = FindLifecycleIndex(baseKey);
   if(idx >= 0)
      g_zoneLifecycle[idx].slotReleased = true;
}

bool ZoneSlotReleased(const string baseKey)
{
   int idx = FindLifecycleIndex(baseKey);
   if(idx < 0)
      return(false);
   return(g_zoneLifecycle[idx].slotReleased);
}

bool ZoneAlreadySentToAnyTarget(const string baseKey)
{
   string legacyPrefix = baseKey + "|";
   for(int i=0; i<ArraySize(g_sentZoneMessages); i++)
   {
      if(g_sentZoneMessages[i].zoneKey == baseKey)
         return(true);
      if(StringFind(g_sentZoneMessages[i].zoneKey,legacyPrefix) == 0)
         return(true);
   }
   return(false);
}

int ActiveOldAlertSlotCount()
{
   int count = 0;
   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!g_zones[i].stillActive)
         continue;

      string baseKey = ZoneBaseKey(g_zones[i]);
      if(!InitialZoneBaseKey(baseKey))
         continue;
      if(!ZoneAlreadySentToAnyTarget(baseKey))
         continue;
      if(ZoneSlotReleased(baseKey))
         continue;

      count++;
   }
   return(count);
}

int ActiveAlertSlotCount()
{
   // Legacy wrapper. Dalam v1.42 slot dihitung hanya untuk zona lama.
   return(ActiveOldAlertSlotCount());
}

bool ZoneEligibleForNewAlertSlot(const ZoneState &z)
{
   if(!z.stillActive)
      return(false);

   // v1.81: jangan blokir z.wasTouched di sini.
   // Kelayakan fresh/remaining ditentukan sepenuhnya oleh ZoneMatchesAlertFilter().
   // Jika user memilih Remaining_Zones_Only, zona remaining yang masih aktif wajib bisa masuk antrean alert.

   if(!ZoneDirectionAllowed(z))
      return(false);
   if(!ZoneMatchesAlertFilter(z))
      return(false);
   if(!ZoneWithinMaxAlertDistance(z))
      return(false);

   string baseKey = ZoneBaseKey(z);
   if(ZoneAlreadySentToAnyTarget(baseKey))
      return(false);

   return(true);
}

int BuildPrioritizedEligibleZoneIndexesByType(int &indexes[],const int zoneType)
{
   // zoneType: 0 = semua, 1 = zona lama initial, 2 = zona baru setelah initial.
   ArrayResize(indexes,0);

   int buyIdx[];
   int sellIdx[];
   double buyDist[];
   double sellDist[];

   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!ZoneEligibleForNewAlertSlot(g_zones[i]))
         continue;

      bool isInitial = ZoneIsOldInitial(g_zones[i]);
      if(zoneType == 1 && !isInitial)
         continue;
      if(zoneType == 2 && isInitial)
         continue;

      double d = ZoneDistanceFromCurrentPrice(g_zones[i]);

      if(g_zones[i].dir == 1)
      {
         int n = ArraySize(buyIdx);
         ArrayResize(buyIdx,n+1);
         ArrayResize(buyDist,n+1);
         buyIdx[n] = i;
         buyDist[n] = d;
      }
      else if(g_zones[i].dir == -1)
      {
         int n = ArraySize(sellIdx);
         ArrayResize(sellIdx,n+1);
         ArrayResize(sellDist,n+1);
         sellIdx[n] = i;
         sellDist[n] = d;
      }
   }

   if(Sort_Alert_Zones_By_Nearest_Price)
   {
      SortZoneIndexesByNearestPrice(buyIdx,buyDist);
      SortZoneIndexesByNearestPrice(sellIdx,sellDist);
   }

   // Alert pertama zona lama wajib mendahulukan minimal 1 BUY dan 1 SELL jika tersedia.
   if(Prioritize_Buy_And_Sell_Zone)
   {
      if(ArraySize(buyIdx) > 0)
         AppendIndex(indexes,buyIdx[0]);
      if(ArraySize(sellIdx) > 0)
         AppendIndex(indexes,sellIdx[0]);
   }

   int restIdx[];
   double restDist[];
   for(int b=0; b<ArraySize(buyIdx); b++)
   {
      if(IndexAlreadyInArray(buyIdx[b],indexes))
         continue;
      int n = ArraySize(restIdx);
      ArrayResize(restIdx,n+1);
      ArrayResize(restDist,n+1);
      restIdx[n] = buyIdx[b];
      restDist[n] = ZoneDistanceFromCurrentPrice(g_zones[buyIdx[b]]);
   }
   for(int s=0; s<ArraySize(sellIdx); s++)
   {
      if(IndexAlreadyInArray(sellIdx[s],indexes))
         continue;
      int n = ArraySize(restIdx);
      ArrayResize(restIdx,n+1);
      ArrayResize(restDist,n+1);
      restIdx[n] = sellIdx[s];
      restDist[n] = ZoneDistanceFromCurrentPrice(g_zones[sellIdx[s]]);
   }

   if(Sort_Alert_Zones_By_Nearest_Price)
      SortZoneIndexesByNearestPrice(restIdx,restDist);

   for(int r=0; r<ArraySize(restIdx); r++)
      AppendIndex(indexes,restIdx[r]);

   return(ArraySize(indexes));
}

void SendQueuedOldZonesByLimit(const string reason)
{
   if(!Send_Zones_On_Start)
      return;

   CaptureInitialZoneSnapshot();

   int prioritizedIndexes[];
   int eligibleOld = BuildPrioritizedEligibleZoneIndexesByType(prioritizedIndexes,1);

   int limit = AlertSlotLimit();
   // v1.46: jika tersedia BUY dan SELL dalam jangkauan, alert awal minimal harus memuat 1 BUY + 1 SELL.
   // Jadi limit efektif tidak boleh di bawah 2 ketika keduanya tersedia.
   if(limit == 1 && ArraySize(prioritizedIndexes) >= 2)
   {
      if(g_zones[prioritizedIndexes[0]].dir != g_zones[prioritizedIndexes[1]].dir)
         limit = 2;
   }

   int activeOldSlots = ActiveOldAlertSlotCount();
   int availableSlots = (limit <= 0 ? 999999 : limit - activeOldSlots);

   if(availableSlots <= 0)
      return;

   int sentNow = 0;

   for(int p=0; p<ArraySize(prioritizedIndexes); p++)
   {
      if(sentNow >= availableSlots)
         break;

      int zi = prioritizedIndexes[p];
      if(SendFilteredZoneAlert(g_zones[zi],reason))
         sentNow++;
   }

   if(sentNow > 0 || eligibleOld > 0)
      Print("Zona lama queue scan: limit=",limit," active_old=",activeOldSlots," available=",availableSlots," eligible_old=",eligibleOld," sent=",sentNow," reason=",reason," TF=",TimeframeToText(_Period));
}

void SendNewlyAppearedValidZones(const string reason)
{
   if(!Alert_New_Valid_Zones_Immediately && !Check_Unsent_Visible_Zones_Every_Scan)
      return;

   // Snapshot wajib sudah ada. Semua zona yang tidak ada di snapshot dianggap zona baru.
   CaptureInitialZoneSnapshot();

   int prioritizedIndexes[];
   int eligibleNew = BuildPrioritizedEligibleZoneIndexesByType(prioritizedIndexes,2);
   int sentNow = 0;

   for(int p=0; p<ArraySize(prioritizedIndexes); p++)
   {
      int zi = prioritizedIndexes[p];
      if(SendFilteredZoneAlert(g_zones[zi],reason))
         sentNow++;
   }

   if(sentNow > 0 || eligibleNew > 0)
      Print("Zona BARU scan: eligible_new=",eligibleNew," sent=",sentNow," reason=",reason," TF=",TimeframeToText(_Period));
}

void SendNextEligibleZonesByAlertSlots(const string reason)
{
   if(!Auto_Send_Next_Zone_When_Slot_Free)
      return;

   // Slot/antrean hanya berlaku untuk zona lama yang masuk snapshot awal.
   SendQueuedOldZonesByLimit(reason);
}

bool ZoneHasOriginalTelegramPost(const string baseKey)
{
   if(WebsiteZoneAlreadySent(baseKey))
      return(true);

   string legacyPrefix = baseKey + "|";
   for(int i=0; i<ArraySize(g_sentZoneMessages); i++)
   {
      if(g_sentZoneMessages[i].zoneKey == baseKey)
         return(true);
      if(StringFind(g_sentZoneMessages[i].zoneKey,legacyPrefix) == 0)
         return(true);
   }
   return(false);
}


void ForceCutLossOnInvalid(const ZoneState &z,const double closePrice,const string reason)
{
   if(!Update_ON || !Update_Loss)
      return;

   string baseKey = ZoneBaseKey(z);
   if(!ZoneHasOriginalTelegramPost(baseKey))
      return;

   int lifeIdx = EnsureLifecycleIndex(baseKey,z);
   if(g_zoneLifecycle[lifeIdx].cutLossSent)
      return;

   bool activeForCutLoss = (g_zoneLifecycle[lifeIdx].entryActive ||
                            g_zoneLifecycle[lifeIdx].tickTouchConfirmed ||
                            g_zoneLifecycle[lifeIdx].touchedAfterAlert ||
                            z.wasTouched);

   // v1.79: Cut Loss / break harus tetap dikirim jika BELUM pernah ada profit update
   // dan BELUM pernah TP. Jangan tahan Loss hanya karena EA tidak sempat menangkap tick
   // masuk zona, karena close candle yang menembus CL sudah cukup sebagai invalidasi final.
   bool alreadyProfitBeforeLoss = (g_zoneLifecycle[lifeIdx].lastRunningStep > 0 ||
                                   g_zoneLifecycle[lifeIdx].tp1Sent ||
                                   g_zoneLifecycle[lifeIdx].tp2Sent ||
                                   g_zoneLifecycle[lifeIdx].tp3Sent);
   if(Strict_Update_After_Alert_Touch && !activeForCutLoss && alreadyProfitBeforeLoss)
   {
      if(Debug_Update_Status_Log)
         Print("Cut Loss invalid ditahan karena zona belum aktif dan sudah ada profit/TP: ",baseKey," | reason=",reason);
      return;
   }
   if(!activeForCutLoss && !alreadyProfitBeforeLoss)
   {
      g_zoneLifecycle[lifeIdx].entryActive = true;
      g_zoneLifecycle[lifeIdx].touchedAfterAlert = true;
      if(Debug_Update_Status_Log)
         Print("Cut Loss diproses walau touch tick tidak tertangkap, karena belum ada profit/TP: ",baseKey," | reason=",reason);
   }

   if(Suppress_Loss_After_Any_TP && (g_zoneLifecycle[lifeIdx].tp1Sent || g_zoneLifecycle[lifeIdx].tp2Sent || g_zoneLifecycle[lifeIdx].tp3Sent))
   {
      g_zoneLifecycle[lifeIdx].cutLossSent = true;
      g_zoneLifecycle[lifeIdx].slotReleased = true;
      return;
   }

   // v1.77: Jika Last Call profit sudah pernah di-update, jangan kirim Cut Loss lagi.
   // Zona tetap dianggap selesai/invalid agar tidak memicu update lanjutan.
   if(Suppress_Loss_After_LastCall_Update && g_zoneLifecycle[lifeIdx].lastRunningStep > 0)
   {
      g_zoneLifecycle[lifeIdx].cutLossSent = true;
      g_zoneLifecycle[lifeIdx].slotReleased = true;
      if(Debug_Update_Status_Log)
         Print("Cut Loss tidak dikirim karena zona sudah update Last Call profit: ",baseKey);
      return;
   }

   double zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss;
   string priceZone;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);

   int clPoints = (int)MathRound(MathAbs(zoneStart - cutLoss) / _Point);
   string statusText = "❌ Hit Cut Loss " + PipsTextFromPoints(clPoints);
   g_zoneLifecycle[lifeIdx].cutLossSent = true;
   g_zoneLifecycle[lifeIdx].slotReleased = true;
   SendZoneUpdateToOriginalTargets(z,baseKey,statusText);
}

void CheckCutLossByClosedCandle(const ZoneState &z,const int barIndex,const int rates_total,const double closePrice)
{
   if(!Update_ON || !Update_Loss)
      return;

   // Cut Loss hanya valid saat candle sudah close.
   if(barIndex != rates_total-2)
      return;

   string baseKey = ZoneBaseKey(z);
   if(!ZoneHasOriginalTelegramPost(baseKey))
      return;

   int lifeIdx = EnsureLifecycleIndex(baseKey,z);
   if(g_zoneLifecycle[lifeIdx].cutLossSent)
      return;

   double zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss;
   string priceZone;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);

   bool hitCL = (z.dir == 1 ? closePrice <= cutLoss : closePrice >= cutLoss);
   if(!hitCL)
      return;

   // v1.79: Cut Loss diprioritaskan sebelum Last Call/TP.
   // Jika belum pernah update Last Call profit dan belum TP, CL wajib dikirim
   // saat candle close melewati level CL, meskipun tick touch tidak sempat tertangkap.
   bool activeForCutLoss = (g_zoneLifecycle[lifeIdx].entryActive ||
                            g_zoneLifecycle[lifeIdx].tickTouchConfirmed ||
                            g_zoneLifecycle[lifeIdx].touchedAfterAlert ||
                            z.wasTouched);
   bool alreadyProfitBeforeLoss = (g_zoneLifecycle[lifeIdx].lastRunningStep > 0 ||
                                   g_zoneLifecycle[lifeIdx].tp1Sent ||
                                   g_zoneLifecycle[lifeIdx].tp2Sent ||
                                   g_zoneLifecycle[lifeIdx].tp3Sent);

   if(Strict_Update_After_Alert_Touch && !activeForCutLoss && alreadyProfitBeforeLoss)
   {
      if(Debug_Update_Status_Log)
         Print("Cut Loss ditahan: zona belum touch tick dan sudah ada profit/TP: ",baseKey);
      return;
   }
   if(!activeForCutLoss && !alreadyProfitBeforeLoss)
   {
      g_zoneLifecycle[lifeIdx].entryActive = true;
      g_zoneLifecycle[lifeIdx].touchedAfterAlert = true;
      if(Debug_Update_Status_Log)
         Print("Cut Loss diproses walau touch tick tidak tertangkap, karena belum ada profit/TP: ",baseKey);
   }
   if(z.wasTouched)
   {
      g_zoneLifecycle[lifeIdx].entryActive = true;
      g_zoneLifecycle[lifeIdx].touchedAfterAlert = true;
   }

   // v1.44: jika zona sudah pernah HIT TP, jangan kirim Loss/Cut Loss lagi.
   // Setelah TP1 tercapai, zona hanya dipantau untuk update profit/TP berikutnya sampai TP3
   // selama zona belum break/invalid.
   if(Suppress_Loss_After_Any_TP && (g_zoneLifecycle[lifeIdx].tp1Sent || g_zoneLifecycle[lifeIdx].tp2Sent || g_zoneLifecycle[lifeIdx].tp3Sent))
   {
      // Jika sudah pernah TP lalu candle close melewati Cut Loss, jangan kirim Loss,
      // tetapi tandai lifecycle selesai/invalid agar Last Call/TP tidak diproses lagi setelah zona break.
      g_zoneLifecycle[lifeIdx].cutLossSent = true;
      g_zoneLifecycle[lifeIdx].slotReleased = true;
      return;
   }

   // v1.77: Jika sudah pernah update Last Call profit, Cut Loss tidak dikirim lagi.
   // Namun zona tetap dikunci selesai/invalid saat break agar tidak muncul sebagai remaining baru.
   if(Suppress_Loss_After_LastCall_Update && g_zoneLifecycle[lifeIdx].lastRunningStep > 0)
   {
      g_zoneLifecycle[lifeIdx].cutLossSent = true;
      g_zoneLifecycle[lifeIdx].slotReleased = true;
      if(Debug_Update_Status_Log)
         Print("Cut Loss tidak dikirim karena zona sudah update Last Call profit: ",baseKey);
      return;
   }

   // Jika slot sudah dirilis karena TP1/TP2/TP3, zona tetap boleh dipantau ulang
   // selama belum Cut Loss / invalid / break. Ini menjaga kasus:
   // harga hit TP1, kembali ke zona, lalu lanjut hit TP2/TP3.
   if(!Continue_Update_After_Reentry_To_Zone && g_zoneLifecycle[lifeIdx].slotReleased)
      return;

   int clPoints = (int)MathRound(MathAbs(zoneStart - cutLoss) / _Point);
   string statusText = "❌ Hit Cut Loss " + PipsTextFromPoints(clPoints);
   g_zoneLifecycle[lifeIdx].cutLossSent = true;
   g_zoneLifecycle[lifeIdx].slotReleased = true;
   SendZoneUpdateToOriginalTargets(z,baseKey,statusText);
}


bool DetectZoneTouchFromHistory(const ZoneState &z,
                                const datetime &time[],
                                const double &high[],
                                const double &low[],
                                const double currentBidPrice,
                                double &deepestTouchPrice)
{
   double zoneHigh = MathMax(z.top,z.bottom);
   double zoneLow  = MathMin(z.top,z.bottom);

   bool touched = false;
   deepestTouchPrice = (z.dir == 1 ? zoneHigh : zoneLow);

   int total = ArraySize(time);
   for(int i=0; i<total; i++)
   {
      if(time[i] <= z.bornTime)
         continue;

      bool barTouched = (high[i] >= zoneLow && low[i] <= zoneHigh);
      if(!barTouched)
         continue;

      touched = true;

      if(z.dir == 1)
      {
         // BUY: entry terdalam adalah harga terendah yang masuk zona.
         double touchPrice = MathMax(low[i],zoneLow);
         if(touchPrice < deepestTouchPrice)
            deepestTouchPrice = touchPrice;
      }
      else
      {
         // SELL: entry terdalam adalah harga tertinggi yang masuk zona.
         double touchPrice = MathMin(high[i],zoneHigh);
         if(touchPrice > deepestTouchPrice)
            deepestTouchPrice = touchPrice;
      }
   }

   // Tambahkan tick berjalan sebagai konfirmasi real-time.
   if(currentBidPrice >= zoneLow && currentBidPrice <= zoneHigh)
   {
      touched = true;
      if(z.dir == 1)
      {
         if(currentBidPrice < deepestTouchPrice)
            deepestTouchPrice = currentBidPrice;
      }
      else
      {
         if(currentBidPrice > deepestTouchPrice)
            deepestTouchPrice = currentBidPrice;
      }
   }

   return(touched);
}

bool DetectTouchAndTPFromHistory(const ZoneState &z,
                                 const datetime &time[],
                                 const double &high[],
                                 const double &low[],
                                 const double currentBidPrice,
                                 const double tp1,
                                 const double tp2,
                                 const double tp3,
                                 double &deepestTouchPrice,
                                 bool &tp1Hit,
                                 bool &tp2Hit,
                                 bool &tp3Hit,
                                 int &maxRunningProfitPoints)
{
   double zoneHigh = MathMax(z.top,z.bottom);
   double zoneLow  = MathMin(z.top,z.bottom);
   double zoneStart = (z.dir == 1 ? zoneHigh : zoneLow);

   bool touched = false;
   deepestTouchPrice = (z.dir == 1 ? zoneHigh : zoneLow);
   tp1Hit = false;
   tp2Hit = false;
   tp3Hit = false;
   maxRunningProfitPoints = 0;

   int total = ArraySize(time);
   for(int i=0; i<total; i++)
   {
      if(time[i] <= z.bornTime)
         continue;

      bool barTouched = (high[i] >= zoneLow && low[i] <= zoneHigh);
      if(barTouched)
      {
         touched = true;
         if(z.dir == 1)
         {
            double touchPrice = MathMax(low[i],zoneLow);
            if(touchPrice < deepestTouchPrice)
               deepestTouchPrice = touchPrice;
         }
         else
         {
            double touchPrice = MathMin(high[i],zoneHigh);
            if(touchPrice > deepestTouchPrice)
               deepestTouchPrice = touchPrice;
         }
      }

      if(!touched)
         continue;

      // Jangan pakai high/low candle yang sama dengan candle sentuhan zona,
      // kecuali mode agresif sengaja dipilih.
      if(Require_Profit_After_Zone_Touch && Same_Candle_Update_Mode != Aggressive_OHLC && barTouched)
         continue;

      if(z.dir == 1)
      {
         if(high[i] >= tp1) tp1Hit = true;
         if(high[i] >= tp2) tp2Hit = true;
         if(high[i] >= tp3) tp3Hit = true;

         // Profit BUY baru valid jika harga sudah keluar dari zona ke arah profit.
         if(Detect_Running_Profit_From_History && high[i] >= zoneStart)
         {
            int profitPts = (int)MathFloor(((high[i] - deepestTouchPrice) / _Point) + 0.000001);
            if(profitPts > maxRunningProfitPoints)
               maxRunningProfitPoints = profitPts;
         }
      }
      else
      {
         if(low[i] <= tp1) tp1Hit = true;
         if(low[i] <= tp2) tp2Hit = true;
         if(low[i] <= tp3) tp3Hit = true;

         // Profit SELL baru valid jika harga sudah keluar dari zona ke arah profit.
         if(Detect_Running_Profit_From_History && low[i] <= zoneStart)
         {
            int profitPts = (int)MathFloor(((deepestTouchPrice - low[i]) / _Point) + 0.000001);
            if(profitPts > maxRunningProfitPoints)
               maxRunningProfitPoints = profitPts;
         }
      }
   }

   if(currentBidPrice >= zoneLow && currentBidPrice <= zoneHigh)
   {
      touched = true;
      if(z.dir == 1)
      {
         if(currentBidPrice < deepestTouchPrice)
            deepestTouchPrice = currentBidPrice;
      }
      else
      {
         if(currentBidPrice > deepestTouchPrice)
            deepestTouchPrice = currentBidPrice;
      }
   }

   if(touched)
   {
      if(z.dir == 1)
      {
         if(currentBidPrice >= tp1) tp1Hit = true;
         if(currentBidPrice >= tp2) tp2Hit = true;
         if(currentBidPrice >= tp3) tp3Hit = true;

         if(Detect_Running_Profit_From_History && currentBidPrice >= zoneStart)
         {
            int profitPts = (int)MathFloor(((currentBidPrice - deepestTouchPrice) / _Point) + 0.000001);
            if(profitPts > maxRunningProfitPoints)
               maxRunningProfitPoints = profitPts;
         }
      }
      else
      {
         if(currentBidPrice <= tp1) tp1Hit = true;
         if(currentBidPrice <= tp2) tp2Hit = true;
         if(currentBidPrice <= tp3) tp3Hit = true;

         if(Detect_Running_Profit_From_History && currentBidPrice <= zoneStart)
         {
            int profitPts = (int)MathFloor(((deepestTouchPrice - currentBidPrice) / _Point) + 0.000001);
            if(profitPts > maxRunningProfitPoints)
               maxRunningProfitPoints = profitPts;
         }
      }
   }

   return(touched);
}



int MaxProfitFromZoneStartHistory(const ZoneState &z,
                                  const double zoneStart,
                                  const datetime &time[],
                                  const double &high[],
                                  const double &low[],
                                  const double currentBidPrice)
{
   double zoneHigh = MathMax(z.top,z.bottom);
   double zoneLow  = MathMin(z.top,z.bottom);
   bool touched = false;
   int maxProfitPoints = 0;

   int total = ArraySize(time);
   for(int i=0; i<total; i++)
   {
      if(time[i] <= z.bornTime)
         continue;

      bool barTouched = (high[i] >= zoneLow && low[i] <= zoneHigh);
      if(barTouched)
         touched = true;

      if(!touched)
         continue;

      if(Require_Profit_After_Zone_Touch && Same_Candle_Update_Mode != Aggressive_OHLC && barTouched)
         continue;

      int profitPts = 0;
      if(z.dir == 1)
      {
         if(high[i] >= zoneStart)
            profitPts = (int)MathFloor(((high[i] - zoneStart) / _Point) + 0.000001);
      }
      else
      {
         if(low[i] <= zoneStart)
            profitPts = (int)MathFloor(((zoneStart - low[i]) / _Point) + 0.000001);
      }

      if(profitPts > maxProfitPoints)
         maxProfitPoints = profitPts;
   }

   if(currentBidPrice >= zoneLow && currentBidPrice <= zoneHigh)
      touched = true;

   if(touched)
   {
      int profitPts = 0;
      if(z.dir == 1)
      {
         if(currentBidPrice >= zoneStart)
            profitPts = (int)MathFloor(((currentBidPrice - zoneStart) / _Point) + 0.000001);
      }
      else
      {
         if(currentBidPrice <= zoneStart)
            profitPts = (int)MathFloor(((zoneStart - currentBidPrice) / _Point) + 0.000001);
      }

      if(profitPts > maxProfitPoints)
         maxProfitPoints = profitPts;
   }

   return(maxProfitPoints);
}



bool DetectRunningProfitFromLastCallHistoryRobust(const ZoneState &z,
                                                    const datetime &time[],
                                                    const double &high[],
                                                    const double &low[],
                                                    const double currentBidPrice,
                                                    double &lastCallPrice,
                                                    int &maxRunningProfitPoints)
{
   double zoneHigh = MathMax(z.top,z.bottom);
   double zoneLow  = MathMin(z.top,z.bottom);
   double zoneStart = (z.dir == 1 ? zoneHigh : zoneLow);

   bool touched = false;
   lastCallPrice = (z.dir == 1 ? zoneHigh : zoneLow);
   maxRunningProfitPoints = 0;

   int total = ArraySize(time);
   if(total <= 0)
      return(false);

   bool ascending = true;
   if(total > 1 && time[0] > time[total-1])
      ascending = false;

   for(int step=0; step<total; step++)
   {
      int i = (ascending ? step : total-1-step);
      if(time[i] <= z.bornTime)
         continue;

      bool barTouched = (high[i] >= zoneLow && low[i] <= zoneHigh);
      if(barTouched)
      {
         touched = true;
         if(z.dir == 1)
         {
            double touchPrice = MathMax(low[i],zoneLow);
            if(touchPrice < lastCallPrice)
               lastCallPrice = touchPrice;
         }
         else
         {
            double touchPrice = MathMin(high[i],zoneHigh);
            if(touchPrice > lastCallPrice)
               lastCallPrice = touchPrice;
         }
      }

      if(!touched)
         continue;

      if(Require_Profit_After_Zone_Touch && Same_Candle_Update_Mode != Aggressive_OHLC && barTouched)
         continue;

      int profitPts = 0;
      if(z.dir == 1)
      {
         if(high[i] >= zoneStart)
            profitPts = (int)MathFloor(((high[i] - lastCallPrice) / _Point) + 0.000001);
      }
      else
      {
         if(low[i] <= zoneStart)
            profitPts = (int)MathFloor(((lastCallPrice - low[i]) / _Point) + 0.000001);
      }

      if(profitPts > maxRunningProfitPoints)
         maxRunningProfitPoints = profitPts;
   }

   if(currentBidPrice >= zoneLow && currentBidPrice <= zoneHigh)
   {
      touched = true;
      if(z.dir == 1)
      {
         if(currentBidPrice < lastCallPrice)
            lastCallPrice = currentBidPrice;
      }
      else
      {
         if(currentBidPrice > lastCallPrice)
            lastCallPrice = currentBidPrice;
      }
   }

   if(touched)
   {
      int profitPts = 0;
      if(z.dir == 1)
      {
         if(currentBidPrice >= zoneStart)
            profitPts = (int)MathFloor(((currentBidPrice - lastCallPrice) / _Point) + 0.000001);
      }
      else
      {
         if(currentBidPrice <= zoneStart)
            profitPts = (int)MathFloor(((lastCallPrice - currentBidPrice) / _Point) + 0.000001);
      }

      if(profitPts > maxRunningProfitPoints)
         maxRunningProfitPoints = profitPts;
   }

   return(touched);
}



bool DetectSequentialTickFastUpdate(const ZoneState &z,
                                    const ulong startMsc,
                                    const double zoneStart,
                                    const double tp1,
                                    const double tp2,
                                    const double tp3,
                                    const bool alreadyEntryActive,
                                    const double initialLastCall,
                                    double &seqLastCallPrice,
                                    int &seqMaxRunningProfitPoints,
                                    bool &seqTp1Hit,
                                    bool &seqTp2Hit,
                                    bool &seqTp3Hit)
{
   seqTp1Hit = false;
   seqTp2Hit = false;
   seqTp3Hit = false;
   seqMaxRunningProfitPoints = 0;

   if(!Use_Tick_Sequence_For_Fast_Update)
      return(false);

   double zoneHigh = MathMax(z.top,z.bottom);
   double zoneLow  = MathMin(z.top,z.bottom);

   datetime fromTime = z.bornTime;
   if(Tick_Sequence_Lookback_Minutes > 0)
   {
      datetime limited = TimeCurrent() - (Tick_Sequence_Lookback_Minutes * 60);
      if(limited > fromTime)
         fromTime = limited;
   }

   MqlTick ticks[];
   ArraySetAsSeries(ticks,false);
   ulong fromMsc = (startMsc > 0 ? startMsc + 1 : (ulong)fromTime * 1000);
   ulong toMsc   = (ulong)TimeCurrent() * 1000 + 999;

   int copied = CopyTicksRange(_Symbol,ticks,COPY_TICKS_INFO,fromMsc,toMsc);
   if(copied <= 0)
      return(false);

   bool touched = alreadyEntryActive;
   seqLastCallPrice = initialLastCall;
   if(seqLastCallPrice <= 0.0)
      seqLastCallPrice = (z.dir == 1 ? zoneHigh : zoneLow);

   for(int i=0; i<copied; i++)
   {
      double price = ticks[i].bid;
      if(price <= 0.0)
         continue;

      bool inZone = (price >= zoneLow && price <= zoneHigh);
      if(inZone)
      {
         touched = true;
         if(z.dir == 1)
         {
            if(price < seqLastCallPrice)
               seqLastCallPrice = price;
         }
         else
         {
            if(price > seqLastCallPrice)
               seqLastCallPrice = price;
         }
      }

      if(!touched)
         continue;

      int profitPts = 0;
      if(z.dir == 1)
      {
         if(price >= zoneHigh)
            profitPts = (int)MathFloor(((price - seqLastCallPrice) / _Point) + 0.000001);
         else
            profitPts = 0;
         if(price >= tp1) seqTp1Hit = true;
         if(price >= tp2) seqTp2Hit = true;
         if(price >= tp3) seqTp3Hit = true;
      }
      else
      {
         if(price <= zoneLow)
            profitPts = (int)MathFloor(((seqLastCallPrice - price) / _Point) + 0.000001);
         else
            profitPts = 0;
         if(price <= tp1) seqTp1Hit = true;
         if(price <= tp2) seqTp2Hit = true;
         if(price <= tp3) seqTp3Hit = true;
      }

      if(profitPts > seqMaxRunningProfitPoints)
         seqMaxRunningProfitPoints = profitPts;
   }

   return(touched);
}


void ProcessHighriskWarningForZone(const ZoneState &z,const string baseKey,const int lifeIdx,const double currentBidPrice,const double zoneStart,const double tp1,const double zoneHigh,const double zoneLow)
{
   if(!Highrisk_Warning_ON || Highrisk_Distance_Points <= 0)
      return;
   if(lifeIdx < 0)
      return;
   if(g_zoneLifecycle[lifeIdx].highriskWarningSent)
      return;

   // Highrisk hanya berlaku sebelum harga benar-benar masuk zona setelah alert.
   // Zona tetap belum aktif; ini hanya warning agar member aware.
   if(g_zoneLifecycle[lifeIdx].tickTouchConfirmed || g_zoneLifecycle[lifeIdx].touchedAfterAlert || g_zoneLifecycle[lifeIdx].entryActive)
      return;

   double dist = Highrisk_Distance_Points * _Point;
   bool nearZone = false;
   bool tp1ReachedBeforeEntry = false;

   if(z.dir == 1)
   {
      // BUY: harga hampir menyentuh zona dari atas, belum masuk zona.
      nearZone = (currentBidPrice > zoneHigh && currentBidPrice <= zoneHigh + dist);
      tp1ReachedBeforeEntry = (currentBidPrice >= tp1);
   }
   else
   {
      // SELL: harga hampir menyentuh zona dari bawah, belum masuk zona.
      nearZone = (currentBidPrice < zoneLow && currentBidPrice >= zoneLow - dist);
      tp1ReachedBeforeEntry = (currentBidPrice <= tp1);
   }

   if(nearZone)
   {
      g_zoneLifecycle[lifeIdx].highriskNearSeen = true;
      if(Debug_Update_Status_Log)
         Print("Highrisk near detected: ",baseKey," | BID=",DoubleToString(currentBidPrice,_Digits));
   }

   if(g_zoneLifecycle[lifeIdx].highriskNearSeen && tp1ReachedBeforeEntry)
   {
      g_zoneLifecycle[lifeIdx].highriskWarningSent = true;
      SendZoneUpdateToOriginalTargets(z,baseKey,"Zona Berubah Highrisk - Running Profit dan HIT TP1 Sebelum Masuk Zona");
      if(Debug_Update_Status_Log)
         Print("Highrisk warning sent: ",baseKey," | BID=",DoubleToString(currentBidPrice,_Digits));
   }
}

void ProcessOneZoneLifecycle(const ZoneState &z,const double currentBidPrice,const datetime &time[],const double &high[],const double &low[])
{
   if(!Update_ON)
      return;

   string baseKey = ZoneBaseKey(z);
   if(!ZoneHasOriginalTelegramPost(baseKey))
      return;

   int lifeIdx = EnsureLifecycleIndex(baseKey,z);

   // v1.40: Jika alert yang dikirim adalah zona Remaining, update Profit/TP/Loss
   // tidak boleh memakai sentuhan lama sebelum alert diposting.
   // History update mulai dihitung dari waktu signal awal terkirim,
   // sehingga Remaining zone bisa dipakai ulang secara bersih.
   ZoneState scanZ = z;
   // v1.41: history scanner tidak boleh membaca sentuhan/running sebelum alert diposting.
   // Berlaku terutama untuk Remaining zone yang bisa dipakai ulang.
   if(g_zoneLifecycle[lifeIdx].alertStartTime > z.bornTime)
      scanZ.bornTime = g_zoneLifecycle[lifeIdx].alertStartTime;

   if(g_zoneLifecycle[lifeIdx].cutLossSent)
      return;

   // Jika slot sudah dirilis karena TP1/TP2/TP3, zona tetap boleh dipantau ulang
   // selama belum Cut Loss / invalid / break. Ini menjaga kasus:
   // harga hit TP1, kembali ke zona, lalu lanjut hit TP2/TP3.
   if(!Continue_Update_After_Reentry_To_Zone && g_zoneLifecycle[lifeIdx].slotReleased)
      return;

   double zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss;
   string priceZone;
   GetZoneTradeLevels(z,zoneStart,zoneEnd,tp1,tp2,tp3,cutLoss,priceZone);

   double zoneHigh = MathMax(z.top,z.bottom);
   double zoneLow  = MathMin(z.top,z.bottom);

   // Layer tambahan v1.85: Highrisk Warning. Tidak mengubah status entry/LastCall/TP utama.
   ProcessHighriskWarningForZone(z,baseKey,lifeIdx,currentBidPrice,zoneStart,tp1,zoneHigh,zoneLow);

   int barsTotal = ArraySize(time);
   int currentBarIndex = barsTotal - 1;
   datetime currentBarTime = (currentBarIndex >= 0 ? time[currentBarIndex] : 0);
   bool currentBarTouched = false;
   if(currentBarIndex >= 0)
      currentBarTouched = (high[currentBarIndex] >= zoneLow && low[currentBarIndex] <= zoneHigh);

   bool wasEntryActiveBefore = g_zoneLifecycle[lifeIdx].entryActive;
   bool touchedByCurrentBidRealtime = (currentBidPrice >= zoneLow && currentBidPrice <= zoneHigh);
   bool justTouchedThisScan = false;
   if(touchedByCurrentBidRealtime)
   {
      // Konfirmasi tick real-time: EA benar-benar melihat harga masuk zona SETELAH alert.
      // Ini menjadi syarat utama sebelum update Profit/TP/Loss diproses.
      if(!g_zoneLifecycle[lifeIdx].tickTouchConfirmed)
      {
         justTouchedThisScan = true;
         g_zoneLifecycle[lifeIdx].touchConfirmTime = TimeCurrent();
      }
      g_zoneLifecycle[lifeIdx].tickTouchConfirmed = true;
      g_zoneLifecycle[lifeIdx].tickTouchBarTime = currentBarTime;
      g_zoneLifecycle[lifeIdx].touchedAfterAlert = true;

      if(Entry_Touch_Alert_ON && !g_zoneLifecycle[lifeIdx].entryTouchAlertSent)
      {
         g_zoneLifecycle[lifeIdx].entryTouchAlertSent = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,"Harga Masuk Zona Entry");
      }
   }

   bool allowSameCandleRealtimeUpdate = true;
   if(Same_Candle_Update_Mode == Conservative_Next_Bar && currentBarTouched)
      allowSameCandleRealtimeUpdate = false;
   if(Same_Candle_Update_Mode == Tick_Confirmed_Only && currentBarTouched && !g_zoneLifecycle[lifeIdx].tickTouchConfirmed)
      allowSameCandleRealtimeUpdate = false;

   // Semua update status zona memakai BID sebagai acuan harga market/chart.
   // Entry aktif tidak boleh hanya bergantung pada posisi BID saat ini.
   // Jika BID pernah menyentuh zona pada candle sebelumnya, EA tetap harus mengenali status entry aktif.
   double detectedLastCall = 0.0;
   bool touchedByHistory = false;
   bool tp1HitByHistory = false;
   bool tp2HitByHistory = false;
   bool tp3HitByHistory = false;
   int  maxRunningProfitByHistory = 0;
   int  maxRunningProfitBySequence = 0;

   if(Detect_Entry_Touch_From_History)
   {
      // Selalu gunakan scanner lengkap agar running profit dari history tetap terbaca,
      // walaupun user mematikan deteksi TP dari history.
      bool fullHistoryTouched = DetectTouchAndTPFromHistory(scanZ,time,high,low,currentBidPrice,tp1,tp2,tp3,detectedLastCall,tp1HitByHistory,tp2HitByHistory,tp3HitByHistory,maxRunningProfitByHistory);
      touchedByHistory = fullHistoryTouched;

      if(!Detect_TP_Hit_From_History)
      {
         tp1HitByHistory = false;
         tp2HitByHistory = false;
         tp3HitByHistory = false;
      }

      if(Force_Running_Update_From_Last_Call_History && Detect_Running_Profit_From_History)
      {
         double robustLastCall = 0.0;
         int robustMaxProfit = 0;
         bool robustTouched = DetectRunningProfitFromLastCallHistoryRobust(scanZ,time,high,low,currentBidPrice,robustLastCall,robustMaxProfit);
         if(robustTouched)
         {
            touchedByHistory = true;
            if(z.dir == 1)
            {
               if(detectedLastCall == 0.0 || robustLastCall < detectedLastCall)
                  detectedLastCall = robustLastCall;
            }
            else
            {
               if(detectedLastCall == 0.0 || robustLastCall > detectedLastCall)
                  detectedLastCall = robustLastCall;
            }
            if(robustMaxProfit > maxRunningProfitByHistory)
               maxRunningProfitByHistory = robustMaxProfit;
         }
      }
   }

   if(Use_Tick_Sequence_For_Fast_Update)
   {
      double seqLastCall = 0.0;
      int seqMaxProfit = 0;
      bool seqTp1 = false;
      bool seqTp2 = false;
      bool seqTp3 = false;
      bool seqTouched = DetectSequentialTickFastUpdate(scanZ,g_zoneLifecycle[lifeIdx].alertStartMsc,zoneStart,tp1,tp2,tp3,
                                                       g_zoneLifecycle[lifeIdx].entryActive || g_zoneLifecycle[lifeIdx].tickTouchConfirmed,
                                                       g_zoneLifecycle[lifeIdx].lastCallPrice,
                                                       seqLastCall,seqMaxProfit,seqTp1,seqTp2,seqTp3);
      if(seqTouched)
      {
         touchedByHistory = true;
         detectedLastCall = seqLastCall;
         if(seqMaxProfit > maxRunningProfitBySequence)
            maxRunningProfitBySequence = seqMaxProfit;
         if(seqMaxProfit > maxRunningProfitByHistory)
            maxRunningProfitByHistory = seqMaxProfit;
         // v1.83: seqTp berasal dari urutan tick setelah alert, bukan OHLC/history.
         // Jadi tetap boleh dipakai meskipun Detect_TP_Hit_From_History=false.
         if(seqTp1) tp1HitByHistory = true;
         if(seqTp2) tp2HitByHistory = true;
         if(seqTp3) tp3HitByHistory = true;
         // Karena urutan tick sudah terkonfirmasi, update profit/TP candle yang sama boleh diproses.
         g_zoneLifecycle[lifeIdx].tickTouchConfirmed = true;
         g_zoneLifecycle[lifeIdx].touchedAfterAlert = true;
         if(currentBarTime > 0)
            g_zoneLifecycle[lifeIdx].tickTouchBarTime = currentBarTime;
      }
   }

   // v1.64: Jangan izinkan update palsu dari history OHLC sebelum ada bukti tick/BID masuk zona SETELAH alert.
   // History hanya boleh membantu SETELAH touch real-time terkonfirmasi. Ini mencegah TP/Running muncul
   // pada zona yang belum dimasuki harga setelah signal dikirim.
   if(Strict_Update_After_Alert_Touch && !g_zoneLifecycle[lifeIdx].tickTouchConfirmed && !touchedByCurrentBidRealtime)
   {
      touchedByHistory = false;
      tp1HitByHistory = false;
      tp2HitByHistory = false;
      tp3HitByHistory = false;
      maxRunningProfitByHistory = 0;
      maxRunningProfitBySequence = 0;
      detectedLastCall = 0.0;
   }

   if(touchedByHistory)
      g_zoneLifecycle[lifeIdx].touchedAfterAlert = true;

   bool touchedByCurrentBid = touchedByCurrentBidRealtime;

   // v1.41: Remaining zone WAJIB menunggu harga masuk ulang setelah alert.
   // Sentuhan lama sebelum alert tidak boleh mengaktifkan update.
   bool touched = false;
   if(g_zoneLifecycle[lifeIdx].requireNewTouchAfterAlert)
   {
      touched = (g_zoneLifecycle[lifeIdx].touchedAfterAlert || touchedByCurrentBid || g_zoneLifecycle[lifeIdx].tickTouchConfirmed || touchedByHistory);
   }
   else
   {
      touched = (touchedByHistory || touchedByCurrentBid || g_zoneLifecycle[lifeIdx].tickTouchConfirmed);
   }

   if(touched)
   {
      g_zoneLifecycle[lifeIdx].entryActive = true;

      bool useHistoryLastCall = (Detect_Entry_Touch_From_History && touchedByHistory && !Strict_Update_After_Alert_Touch);
      if(Same_Candle_Update_Mode != Aggressive_OHLC && currentBarTouched)
         useHistoryLastCall = false;

      if(useHistoryLastCall)
      {
         if(z.dir == 1)
         {
            if(g_zoneLifecycle[lifeIdx].lastCallPrice == 0.0 || detectedLastCall < g_zoneLifecycle[lifeIdx].lastCallPrice)
               g_zoneLifecycle[lifeIdx].lastCallPrice = detectedLastCall;
         }
         else
         {
            if(g_zoneLifecycle[lifeIdx].lastCallPrice == 0.0 || detectedLastCall > g_zoneLifecycle[lifeIdx].lastCallPrice)
               g_zoneLifecycle[lifeIdx].lastCallPrice = detectedLastCall;
         }
      }
      else if(touchedByCurrentBid)
      {
         // Fallback real-time jika history detection dimatikan.
         if(z.dir == 1)
         {
            double deepBuy = MathMax(currentBidPrice,zoneLow);
            if(g_zoneLifecycle[lifeIdx].lastCallPrice == 0.0 || deepBuy < g_zoneLifecycle[lifeIdx].lastCallPrice)
               g_zoneLifecycle[lifeIdx].lastCallPrice = deepBuy;
         }
         else
         {
            double deepSell = MathMin(currentBidPrice,zoneHigh);
            if(g_zoneLifecycle[lifeIdx].lastCallPrice == 0.0 || deepSell > g_zoneLifecycle[lifeIdx].lastCallPrice)
               g_zoneLifecycle[lifeIdx].lastCallPrice = deepSell;
         }
      }
   }

   if(!g_zoneLifecycle[lifeIdx].entryActive)
      return;

   if(Strict_Update_After_Alert_Touch && !g_zoneLifecycle[lifeIdx].tickTouchConfirmed && !g_zoneLifecycle[lifeIdx].touchedAfterAlert)
   {
      if(Debug_Update_Status_Log)
         Print("Update ditahan: belum ada touch real-time setelah alert: ",baseKey);
      return;
   }

   // v1.44: baru masuk zona = belum boleh langsung dianggap Profit/RR/TP.
   // Tunggu harga benar-benar keluar dari zona ke arah profit pada tick/scan berikutnya.
   if(justTouchedThisScan && touchedByCurrentBidRealtime && !wasEntryActiveBefore)
   {
      if(Debug_Update_Status_Log)
         Print("Zona baru disentuh, update profit/TP ditahan dulu: ",baseKey," | BID=",DoubleToString(currentBidPrice,_Digits));
      return;
   }

   // Fallback penting: jika zona sudah aktif tetapi Last Call belum tersimpan,
   // gunakan awal zona agar update running tidak gagal karena lastCallPrice = 0.
   if(g_zoneLifecycle[lifeIdx].lastCallPrice == 0.0)
      g_zoneLifecycle[lifeIdx].lastCallPrice = zoneStart;

   double currentPrice = currentBidPrice;

   // v1.41: untuk Remaining yang baru diposting, jangan gunakan history profit/TP lama
   // sebelum ada sentuhan baru yang terkonfirmasi setelah alert.
   if(g_zoneLifecycle[lifeIdx].requireNewTouchAfterAlert && !g_zoneLifecycle[lifeIdx].touchedAfterAlert && !touchedByCurrentBidRealtime)
   {
      if(Debug_Update_Status_Log)
         Print("Menunggu sentuhan baru untuk Remaining: ",baseKey," | update ditahan");
      return;
   }

   // v1.86: TP update hanya boleh dari BID realtime saat ini, bukan OHLC/history dan bukan tick sequence lama.
   // Variabel history tetap dinolkan agar tidak memicu HIT TP palsu.
   tp1HitByHistory = false;
   tp2HitByHistory = false;
   tp3HitByHistory = false;

   // v1.89: profitBaseForTP harus berada di scope utama fungsi,
   // karena dipakai juga oleh Last Call setelah TP3.
   double profitBaseForTP = g_zoneLifecycle[lifeIdx].lastCallPrice;
   if(profitBaseForTP <= 0.0)
      profitBaseForTP = zoneStart;

   if(Update_TP)
   {
      bool tp1HitNow = false;
      bool tp2HitNow = false;
      bool tp3HitNow = false;
      if(allowSameCandleRealtimeUpdate)
      {
         tp1HitNow = (z.dir == 1 ? currentPrice >= tp1 : currentPrice <= tp1);
         tp2HitNow = (z.dir == 1 ? currentPrice >= tp2 : currentPrice <= tp2);
         tp3HitNow = (z.dir == 1 ? currentPrice >= tp3 : currentPrice <= tp3);
      }

      // v1.97: jika harga langsung lompat ke TP lebih jauh pada scan yang sama,
      // kirim hanya update tertinggi agar Telegram tidak antre TP1->TP2->TP3.
      // Status TP yang lebih rendah tetap ditandai Done pada posting awal.
      if(!g_zoneLifecycle[lifeIdx].tp3Sent && tp3HitNow)
      {
         g_zoneLifecycle[lifeIdx].tp1Sent = true;
         g_zoneLifecycle[lifeIdx].tp2Sent = true;
         g_zoneLifecycle[lifeIdx].tp3Sent = true;
         if(Release_Alert_Slot_After_TP_Level >= 1 && Release_Alert_Slot_After_TP_Level <= 3)
            g_zoneLifecycle[lifeIdx].slotReleased = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,TpHitStatusText(3,profitBaseForTP,tp3));
      }
      else if(!g_zoneLifecycle[lifeIdx].tp2Sent && tp2HitNow)
      {
         g_zoneLifecycle[lifeIdx].tp1Sent = true;
         g_zoneLifecycle[lifeIdx].tp2Sent = true;
         if(Release_Alert_Slot_After_TP_Level == 1 || Release_Alert_Slot_After_TP_Level == 2)
            g_zoneLifecycle[lifeIdx].slotReleased = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,TpHitStatusText(2,profitBaseForTP,tp2));
      }
      else if(!g_zoneLifecycle[lifeIdx].tp1Sent && tp1HitNow)
      {
         g_zoneLifecycle[lifeIdx].tp1Sent = true;
         if(Release_Alert_Slot_After_TP_Level == 1)
            g_zoneLifecycle[lifeIdx].slotReleased = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,TpHitStatusText(1,profitBaseForTP,tp1));
      }

      // Hold 1 / Hold 2 tetap memakai level default dari awal zona,
      // tetapi profit yang ditulis dihitung dari Last Call seperti TP.
      double hold1Level,hold2Level,hold3Level;
      GetHoldLevels(z,zoneStart,hold1Level,hold2Level,hold3Level);
      bool hold1HitNow = (allowSameCandleRealtimeUpdate ? (z.dir == 1 ? currentPrice >= hold1Level : currentPrice <= hold1Level) : false);
      bool hold2HitNow = (allowSameCandleRealtimeUpdate ? (z.dir == 1 ? currentPrice >= hold2Level : currentPrice <= hold2Level) : false);
      bool hold3HitNow = (allowSameCandleRealtimeUpdate ? (z.dir == 1 ? currentPrice >= hold3Level : currentPrice <= hold3Level) : false);

      if(!g_zoneLifecycle[lifeIdx].hold3Sent && hold3HitNow)
      {
         g_zoneLifecycle[lifeIdx].hold1Sent = true;
         g_zoneLifecycle[lifeIdx].hold2Sent = true;
         g_zoneLifecycle[lifeIdx].hold3Sent = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,HoldHitStatusText(3,profitBaseForTP,hold3Level));
      }
      else if(!g_zoneLifecycle[lifeIdx].hold2Sent && hold2HitNow)
      {
         g_zoneLifecycle[lifeIdx].hold1Sent = true;
         g_zoneLifecycle[lifeIdx].hold2Sent = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,HoldHitStatusText(2,profitBaseForTP,hold2Level));
      }
      else if(!g_zoneLifecycle[lifeIdx].hold1Sent && hold1HitNow)
      {
         g_zoneLifecycle[lifeIdx].hold1Sent = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,HoldHitStatusText(1,profitBaseForTP,hold1Level));
      }
   }

   bool allowLastCallUpdatePhase = (!g_zoneLifecycle[lifeIdx].hold1Sent);

   // v1.98 FIX: Last Call tidak boleh tertahan oleh mode conservative same-candle.
   // Setelah EA melihat BID masuk zona secara realtime, running profit Last Call wajib dipantau
   // dari harga masuk terdalam walaupun candle yang sama masih overlap dengan zona.
   // Guard justTouchedThisScan di atas tetap mencegah update palsu pada tick pertama saat baru masuk zona.
   bool allowLastCallRealtimeUpdate = (g_zoneLifecycle[lifeIdx].tickTouchConfirmed || g_zoneLifecycle[lifeIdx].touchedAfterAlert);

   if(Update_LastCall_Profit && LastCall_Profit_Points > 0 && allowLastCallUpdatePhase)
   {
      double profitPointsD = 0.0;
      if(allowLastCallRealtimeUpdate)
      {
         if(z.dir == 1)
         {
            if(currentPrice >= zoneStart)
               profitPointsD = (currentPrice - g_zoneLifecycle[lifeIdx].lastCallPrice) / _Point;
            else
               profitPointsD = 0.0;
         }
         else
         {
            if(currentPrice <= zoneStart)
               profitPointsD = (g_zoneLifecycle[lifeIdx].lastCallPrice - currentPrice) / _Point;
            else
               profitPointsD = 0.0;
         }
      }

      int profitPoints = (int)MathFloor(profitPointsD + 0.000001);
      // v1.86: Last Call profit hanya memakai BID realtime saat scan ini.
      // Tidak memakai maxRunningProfitBySequence / tick history agar tidak muncul update palsu
      // ketika harga baru masuk zona tetapi belum benar-benar mencapai TP/Running saat ini.
      int rrProfitPoints = profitPoints;

      int zoneSizePoints = (int)MathRound(MathAbs(zoneStart - zoneEnd) / _Point);
      if(Update_RR_1_1_Profit && !g_zoneLifecycle[lifeIdx].rrOneToOneSent && zoneSizePoints > 0 && rrProfitPoints >= zoneSizePoints)
      {
         g_zoneLifecycle[lifeIdx].rrOneToOneSent = true;
         SendZoneUpdateToOriginalTargets(z,baseKey,RROneToOneStatusText(zoneSizePoints));
      }

      if(profitPoints < 0)
         profitPoints = 0;

      // v1.78: cegah false update BUY/SELL. Last Call Profit hanya valid jika:
      // 1) ada touch tick realtime setelah signal, dan
      // 2) harga sekarang sudah benar-benar berada di sisi profit dari Last Call.
      if(!g_zoneLifecycle[lifeIdx].tickTouchConfirmed || !g_zoneLifecycle[lifeIdx].touchedAfterAlert)
         profitPoints = 0;

      // v1.89: Last Call sebelum TP1 memakai kelipatan normal dari LastCall_Profit_Points.
      // Setelah TP3, Last Call boleh aktif lagi, tapi threshold-nya harus dilanjut dari profit TP3.
      // Contoh TP3 = 100 pips dan LastCall_Profit_Points = 30 pips, update berikutnya baru pada 130 pips, lalu 160 pips, dst.
      bool fromLastCall = false;
      if(z.dir == 1 && g_zoneLifecycle[lifeIdx].lastCallPrice < zoneStart - (_Point/2.0))
         fromLastCall = true;
      if(z.dir == -1 && g_zoneLifecycle[lifeIdx].lastCallPrice > zoneStart + (_Point/2.0))
         fromLastCall = true;

      // v1.99 FINAL: Last Call dipisah antara ALERT dan DASHBOARD.
      // - Sebelum TP1: Last Call pertama/milestone boleh mengirim alert.
      // - Setelah TP1/TP2/TP3: Last Call TIDAK spam alert, tetapi postingan awal tetap diedit
      //   setiap best running profit bertambah sampai Hold. TP/Hold tetap prioritas karena diproses di atas.
      int currentStep = profitPoints / LastCall_Profit_Points;

      if(Debug_Update_Status_Log && profitPoints >= LastCall_Profit_Points)
      {
         Print("Running check ",baseKey,
               " | phase=LASTCALL_DASHBOARD",
               " | profitPoints=",profitPoints,
               " | step=",currentStep,
               " | lastStep=",g_zoneLifecycle[lifeIdx].lastRunningStep,
               " | tp1Sent=",g_zoneLifecycle[lifeIdx].tp1Sent,
               " | tp2Sent=",g_zoneLifecycle[lifeIdx].tp2Sent,
               " | tp3Sent=",g_zoneLifecycle[lifeIdx].tp3Sent,
               " | lastCall=",DoubleToString(g_zoneLifecycle[lifeIdx].lastCallPrice,_Digits),
               " | currentBid=",DoubleToString(currentBidPrice,_Digits),
               " | tickConfirmed=",g_zoneLifecycle[lifeIdx].tickTouchConfirmed);
      }

      if(currentStep > g_zoneLifecycle[lifeIdx].lastRunningStep)
      {
         for(int step=g_zoneLifecycle[lifeIdx].lastRunningStep+1; step<=currentStep; step++)
         {
            int updatePoints = step * LastCall_Profit_Points;
            string statusText = "✅ Running Profit " + PipsTextFromPoints(updatePoints);

            if(Use_Last_Call_Running_Text && fromLastCall)
               statusText += " - Dari Last Call";

            // Alert Last Call hanya sebelum TP1: pertama dan milestone.
            // Setelah TP1, Last Call hanya mengedit postingan awal sebagai dashboard berjalan.
            bool sendLastCallAlert = (!g_zoneLifecycle[lifeIdx].tp1Sent && (step == 1 || IsLastCallAlertMilestone(updatePoints)));
            if(sendLastCallAlert)
               SendZoneUpdateToOriginalTargets(z,baseKey,statusText);
            else
               UpdateZoneResultDisplayOnlyToOriginalTargets(z,baseKey,statusText);
         }
         g_zoneLifecycle[lifeIdx].lastRunningStep = currentStep;
      }
   }
}

void ProcessZoneLifecycleUpdates(const datetime &time[],const double &high[],const double &low[],const double &close[])
{
   int total = ArraySize(time);
   if(total < 2)
      return;

   int currentIdx = total - 1;
   int closedIdx  = total - 2;

   // Running profit, TP, entry active, dan Last Call memakai harga BID market.
   // Cut Loss tetap menunggu closing candle; close candle MT5 adalah acuan BID chart.
   double currentBidPrice = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(currentBidPrice <= 0.0)
      currentBidPrice = close[currentIdx];

   for(int i=0; i<ArraySize(g_zones); i++)
   {
      if(!g_zones[i].stillActive)
         continue;

      // v1.75: Cut Loss / invalid harus dicek lebih dulu sebelum Last Call/TP.
      // Jika candle closed sudah melewati Cut Loss, zona selesai dan tidak boleh lagi
      // mengirim update Running Profit dari Last Call pada scan yang sama.
      CheckCutLossByClosedCandle(g_zones[i],closedIdx,total,close[closedIdx]);

      string baseKey = ZoneBaseKey(g_zones[i]);
      int lifeIdx = FindLifecycleIndex(baseKey);
      if(lifeIdx >= 0 && g_zoneLifecycle[lifeIdx].cutLossSent)
         continue;

      ProcessOneZoneLifecycle(g_zones[i],currentBidPrice,time,high,low);
   }
}

//====================================================================
// DATA PROCESSING
//====================================================================
bool LoadRates(datetime &time[],double &open[],double &high[],double &low[],double &close[])
{
   int barsToCopy = MathMax(Lookback_Bars + 50, 200);
   MqlRates rates[];
   ArraySetAsSeries(rates,false);

   int copied = CopyRates(_Symbol,_Period,0,barsToCopy,rates);
   if(copied < 20)
   {
      Print("Data candle belum cukup. Copied rates: ",copied);
      return(false);
   }

   ArrayResize(time,copied);
   ArrayResize(open,copied);
   ArrayResize(high,copied);
   ArrayResize(low,copied);
   ArrayResize(close,copied);

   for(int i=0; i<copied; i++)
   {
      time[i]  = rates[i].time;
      open[i]  = rates[i].open;
      high[i]  = rates[i].high;
      low[i]   = rates[i].low;
      close[i] = rates[i].close;
   }

   return(true);
}

void ProcessSignalScan(const bool force=false)
{
   datetime time[];
   double open[];
   double high[];
   double low[];
   double close[];

   if(!LoadRates(time,open,high,low,close))
      return;

   int rates_total = ArraySize(time);
   if(rates_total < 20)
      return;

   datetime currentBarTime = time[rates_total-1];

   // v1.67: timeframe/symbol adalah konteks analisis yang berbeda.
   // Jika user pindah dari M5 ke M15, zona M5 tidak boleh dipreserve / digambar ulang di M15.
   bool symbolOrTimeframeChanged = (g_lastKnownSymbol != "" &&
                                  (g_lastKnownSymbol != _Symbol || g_lastKnownPeriod != (int)_Period));
   if(symbolOrTimeframeChanged)
   {
      Print("Konteks symbol/timeframe berubah. Bersihkan zona chart lama: ",
            g_lastKnownSymbol," ",g_lastKnownPeriod," -> ",_Symbol," ",TimeframeToText(_Period));

      DeleteAllOwnObjects();
      ArrayResize(g_zones,0);
      ArrayResize(g_knownZoneBaseKeys,0);
      ArrayResize(g_initialZoneBaseKeys,0);
      g_knownZonesInitialized = false;
      g_initialSnapshotReady = false;
      g_startAllZonesSent = false;
      g_lastProcessedBarTime = 0;
      g_lastDrawTime = 0;
      g_lastDrawPrice = 0.0;
   }

   g_lastKnownSymbol = _Symbol;
   g_lastKnownPeriod = (int)_Period;

   bool filterChangedNow = (g_lastKnownFilter != (int)Zone_Filter || g_lastKnownChartFilter != (int)Chart_Zone_Filter);

   if(!force && !symbolOrTimeframeChanged && currentBarTime == g_lastProcessedBarTime && !(Rebuild_Zones_When_Filter_Changed && filterChangedNow))
   {
      // Pada candle yang sama, zona tidak perlu dibangun ulang,
      // tetapi update TP/running profit dan countdown tetap harus dipantau real-time.
      DrawCandleCountdown(currentBarTime,close[rates_total-1]);
      ProcessZoneLifecycleUpdates(time,high,low,close);
      SendNextEligibleZonesByAlertSlots("SLOT_SCAN_" + TimeframeToText(_Period));
      ProcessPendingDeletes();
      ProcessScheduledReports();
      return;
   }

   if(Rebuild_Zones_When_Filter_Changed && filterChangedNow)
   {
      g_startAllZonesSent = false;
      Print("Filter zona berubah. Rebuild/redraw dipaksa. AlertFilter=",(int)Zone_Filter," | ChartFilter=",(int)Chart_Zone_Filter," | TF=",TimeframeToText(_Period));
   }

   g_lastProcessedBarTime = currentBarTime;
   g_lastKnownFilter = (int)Zone_Filter;
   g_lastKnownChartFilter = (int)Chart_Zone_Filter;

   RebuildZones(rates_total,time,open,high,low,close);
   g_lastDrawTime = time[rates_total-1];
   g_lastDrawPrice = close[rates_total-1];
   DrawAllZoneObjects();
   DrawCandleCountdown(currentBarTime,close[rates_total-1]);
   SendAllSelectedZonesOnStart();
   SendNewlyAppearedValidZones("NEW_VALID_ZONE_" + TimeframeToText(_Period));
   ProcessZoneLifecycleUpdates(time,high,low,close);
   SendNextEligibleZonesByAlertSlots("SLOT_SCAN_" + TimeframeToText(_Period));
   ProcessPendingDeletes();
   ProcessScheduledReports();
}

//====================================================================
// EA EVENTS
//====================================================================
int OnInit()
{
   if(!CheckKamarLicense())
      return(INIT_FAILED);

   LoadReportData();
   LoadSentReportKeys();
   Print("Kamar Signal Advisor - v2.05 Final Corrected End Zone Filter started on ",_Symbol," ",TimeframeToText(_Period)," | Visual zones ON: ",Show_Zones_On_Chart," | Start selected zones alert: ",Send_Zones_On_Start," | AlertFilter: ",(int)Zone_Filter," | ChartFilter: ",(int)Chart_Zone_Filter," | Max send: ",Max_Zones_Per_Scan," | History touch detect: ",Detect_Entry_Touch_From_History," | History TP detect: ",Detect_TP_Hit_From_History," | Re-entry update: ",Continue_Update_After_Reentry_To_Zone);
   if(Scan_Every_Seconds > 0)
      EventSetTimer(Scan_Every_Seconds);

   Print("Website Update: ",(Website_Update_ON ? "ON" : "OFF")," | URL: ",Website_API_URL," | Visibility: ",Website_Visibility," | Prefix: ",Website_Zone_ID_Prefix," | TestOnStart: ",(Website_Send_Test_On_Start ? "ON" : "OFF")," | Heartbeat: ",Website_Price_Heartbeat_Seconds,"s");
   SendStartTestMessage();
   if(Website_Send_Test_On_Start)
      WebsiteSendConnectivityTest();
   ProcessSignalScan(true);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   SaveReportData();
   SaveSentReportKeys();
   EventKillTimer();
   DeleteAllOwnObjects();
   Print("Kamar Signal Advisor - v2.05 Final Corrected End Zone Filter stopped. Reason: ",reason);
}

void OnTick()
{
   if(!CheckKamarLicense())
      return;
   ProcessSignalScan(false);
}

void OnTimer()
{
   if(!CheckKamarLicense())
      return;
   ProcessSignalScan(false);
   WebsiteSendPriceHeartbeatIfDue();
}

void OnChartEvent(const int id,const long &lparam,const double &dparam,const string &sparam)
{
   if(id == CHARTEVENT_CHART_CHANGE)
   {
      // Saat user pindah timeframe/symbol, paksa rebuild + scan ulang zona yang terlihat.
      if(Resend_Zones_When_Timeframe_Changed)
         g_startAllZonesSent = false;
      ProcessSignalScan(true);
      DrawAllZoneObjects();
   }
}
