import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Printer, Save, Cloud, Check, AlertCircle } from 'lucide-react';
import { createRoot } from 'react-dom/client';

// 自社情報の保存先：ブラウザのlocalStorageのみ（外部送信なし・PC内に保持）
const STORAGE_KEY = 'topica-invoice-defaults-v1';

// 備考欄のデフォルト文言
const defaultNoteTaxExempt = `振込手数料は貴社にてご負担願います。`;
const defaultNoteQualified = `振込手数料は貴社にてご負担願います。`;

function App() {
  const [basicInfo, setBasicInfo] = useState({
    businessType: 'tax-exempt',
    registrationNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
    billTo: '',
    billToSuffix: '御中',
    subject: '',
    myName: '',
    postalCode: '',
    address: '',
    buildingName: '',
    tel: '',
    email: '',
    bankName: '',
    branchName: '',
    accountType: '普通',
    accountNumber: '',
    accountName: '', // 口座名義（漢字）
    accountNameKana: '',
    note: defaultNoteTaxExempt,
  });

  const [items, setItems] = useState([
    { id: 1, deliveryMonth: '', projectName: '', name: 'PR費用', quantity: 1, price: '', taxRate: 10, type: 'normal', subjectToWithholding: false }
  ]);

  const [saveStatus, setSaveStatus] = useState('');

  // プレビューのスケール管理用
  const [previewScale, setPreviewScale] = useState(1);

  // 免税事業者かどうかの判定用フラグ
  const isTaxExempt = basicInfo.businessType === 'tax-exempt';

  // エラー状態の計算（即時バリデーション）
  const errors = useMemo(() => {
    const e = {};
    if (!basicInfo.myName.trim()) e.myName = "屋号・氏名を入力してください。";
    if (!basicInfo.dueDate) e.dueDate = "お支払期限を入力してください。";

    if (!basicInfo.postalCode.trim()) {
      e.postalCode = "郵便番号を入力してください。";
    } else if (!/^\d{3}-\d{4}$/.test(basicInfo.postalCode)) {
      e.postalCode = "郵便番号は「000-0000」の形式で入力してください。";
    }

    if (!basicInfo.address.trim()) e.address = "住所を入力してください。";

    if (!basicInfo.tel.trim()) {
      e.tel = "電話番号を入力してください。";
    } else if (!/^[\d-]+$/.test(basicInfo.tel)) {
      e.tel = "電話番号は半角数字とハイフンで入力してください。";
    }

    if (!basicInfo.email.trim()) e.email = "メールアドレスを入力してください。";

    // 振込先情報の必須化
    if (!basicInfo.bankName.trim()) e.bankName = "金融機関名を入力してください。";
    if (!basicInfo.branchName.trim()) e.branchName = "支店名を入力してください。";

    if (!basicInfo.accountNumber.trim()) {
      e.accountNumber = "口座番号を入力してください。";
    } else if (!/^\d{7}$/.test(basicInfo.accountNumber)) {
      e.accountNumber = "口座番号は7桁の数字で入力してください。";
    }

    if (!basicInfo.accountName.trim()) {
      e.accountName = "口座名義（漢字）を入力してください。";
    }

    if (!basicInfo.accountNameKana.trim()) {
      e.accountNameKana = "口座名義（カナ）を入力してください。";
    } else if (!/^[ァ-ヶー・\s　]+$/.test(basicInfo.accountNameKana)) {
      e.accountNameKana = "口座名義（カナ）は全角カタカナで入力してください。";
    }

    if (basicInfo.businessType === 'qualified') {
      if (!basicInfo.registrationNumber.trim()) {
        e.registrationNumber = "登録番号を入力してください。";
      } else if (!/^\d{13}$/.test(basicInfo.registrationNumber)) {
        e.registrationNumber = "登録番号はTに続く13桁の半角数字で入力してください。";
      }
    }
    return e;
  }, [basicInfo]);

  const hasErrors = Object.keys(errors).length > 0;

  // 保存済みの自社情報をlocalStorageからロード
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.basicInfo) {
        setBasicInfo(prev => ({
          ...prev,
          businessType: data.basicInfo.businessType || prev.businessType,
          registrationNumber: data.basicInfo.registrationNumber || prev.registrationNumber,
          myName: data.basicInfo.myName || prev.myName,
          postalCode: data.basicInfo.postalCode || prev.postalCode,
          address: data.basicInfo.address || prev.address,
          buildingName: data.basicInfo.buildingName || prev.buildingName,
          tel: data.basicInfo.tel || prev.tel,
          email: data.basicInfo.email || prev.email,
          bankName: data.basicInfo.bankName || prev.bankName,
          branchName: data.basicInfo.branchName || prev.branchName,
          accountType: data.basicInfo.accountType || prev.accountType,
          accountNumber: data.basicInfo.accountNumber || prev.accountNumber,
          accountName: data.basicInfo.accountName || prev.accountName,
          accountNameKana: data.basicInfo.accountNameKana || prev.accountNameKana,
          note: data.basicInfo.note || prev.note,
        }));
      }
    } catch (error) {
      console.error("Load error:", error);
    }
  }, []);

  // レスポンシブプレビュー
  useEffect(() => {
    const updateScale = () => {
      const windowWidth = window.innerWidth;
      const maxWidth = windowWidth - 32;
      const a4Width = 794;

      if (maxWidth < a4Width) {
        setPreviewScale(Math.max(maxWidth / a4Width, 0.6));
      } else {
        setPreviewScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // 自社情報の設定をlocalStorageへ保存（このPC・このブラウザ内のみ）
  const handleSaveDefaults = () => {
    if (hasErrors) return;
    setSaveStatus('saving');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        basicInfo: {
          businessType: basicInfo.businessType,
          registrationNumber: basicInfo.registrationNumber,
          myName: basicInfo.myName,
          postalCode: basicInfo.postalCode,
          address: basicInfo.address,
          buildingName: basicInfo.buildingName,
          tel: basicInfo.tel,
          email: basicInfo.email,
          bankName: basicInfo.bankName,
          branchName: basicInfo.branchName,
          accountType: basicInfo.accountType,
          accountNumber: basicInfo.accountNumber,
          accountName: basicInfo.accountName,
          accountNameKana: basicInfo.accountNameKana,
          note: basicInfo.note,
        },
        updatedAt: new Date().toISOString()
      }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;

    // 口座番号は数字のみ、最大7桁
    if (name === 'accountNumber') {
      const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 7);
      setBasicInfo(prev => ({ ...prev, [name]: digitsOnly }));
      return;
    }

    // 郵便番号の自動ハイフン挿入処理
    if (name === 'postalCode') {
      let val = value.replace(/[^\d-]/g, '');
      let digits = val.replace(/-/g, '');
      if (digits.length > 3) {
        digits = `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
      }
      setBasicInfo(prev => ({ ...prev, [name]: digits }));
      return;
    }

    setBasicInfo(prev => {
      const nextState = { ...prev, [name]: value };

      if (name === 'businessType') {
        const isCurrentNoteDefault =
          prev.note === defaultNoteTaxExempt ||
          prev.note === defaultNoteQualified ||
          prev.note.trim() === '';

        if (isCurrentNoteDefault) {
          nextState.note = value === 'qualified' ? defaultNoteQualified : defaultNoteTaxExempt;
        }
      }
      return nextState;
    });
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), deliveryMonth: '', projectName: '', name: '', quantity: 1, price: '', taxRate: 10, type: 'normal', subjectToWithholding: false }]);
  };

  const addReimbursementItem = () => {
    setItems([...items, { id: Date.now(), deliveryMonth: '', projectName: '', name: '立替費用', quantity: 1, price: '', taxRate: 0, type: 'reimbursement', subjectToWithholding: false }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // 計算ロジック
  let subtotal10 = 0;
  let subtotal8 = 0;
  let subtotal0 = 0;
  let withholdingTargetAmount = 0;

  items.forEach(item => {
    // priceにカンマが含まれている可能性があるため、数値化する前に取り除く
    const priceValue = Number(String(item.price).replace(/,/g, '')) || 0;
    const lineTotal = priceValue * (Number(item.quantity) || 0);

    if (isTaxExempt) {
      subtotal0 += lineTotal;
    } else {
      if (Number(item.taxRate) === 10) subtotal10 += lineTotal;
      else if (Number(item.taxRate) === 8) subtotal8 += lineTotal;
      else subtotal0 += lineTotal;
    }

    if (item.subjectToWithholding) {
      withholdingTargetAmount += lineTotal;
    }
  });

  const tax10 = Math.floor(subtotal10 * 0.1);
  const tax8 = Math.floor(subtotal8 * 0.08);

  const subtotal = subtotal10 + subtotal8 + subtotal0;
  const totalTax = tax10 + tax8;

  const withholdingTax = Math.floor(withholdingTargetAmount * 0.1021);
  const totalAmount = subtotal + totalTax - withholdingTax;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  const getItemPricePlaceholder = (item) => {
    if (item.type === 'reimbursement') {
      if (isTaxExempt) {
        return '立て替えた税込分を入力してください。\n超えた分は指定された上限金額を入力してください。';
      } else {
        return '立て替えた税込分を入力してください。\n超えた分は指定された上限金額を入力してください。\n税率は非課税としてください。';
      }
    }
    return '150,000'; // プレースホルダーもカンマ付きに
  };

  const handlePrint = () => {
    if (hasErrors) return;

    const dateObj = new Date(basicInfo.date);
    const yyyymm = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const fileName = `${yyyymm}_株式会社トピカ${basicInfo.billToSuffix}_${basicInfo.myName.trim()}_請求書`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
      return;
    }

    const previewElement = document.getElementById('print-root');
    const previewHtml = previewElement ? previewElement.outerHTML : '';

    let stylesHtml = '';
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (const rule of rules) {
          stylesHtml += rule.cssText;
        }
      } catch (e) {}
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            ${stylesHtml}
            body {
              background-color: white;
              color: black;
              font-family: sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0;
              padding: 0;
            }
            @media print {
              @page { size: A4; margin: 0; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body class="bg-gray-100 flex justify-center py-10 print:py-0 print:block">
          ${previewHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <div className="print:hidden p-4 md:p-6 max-w-[1500px] w-full mx-auto space-y-6">

        {/* レスポンシブ対応：ヘッダー部分 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex flex-wrap items-center gap-2 md:gap-3">
             請求書作成ツール
             <span className={`text-xs md:text-sm font-normal px-2 md:px-2.5 py-1 rounded-md ${basicInfo.businessType === 'qualified' ? 'bg-green-100 text-green-700' : 'text-gray-500 bg-gray-100'}`}>
               {basicInfo.businessType === 'qualified' ? '適格請求書発行事業者' : '免税事業者・個人向け'}
             </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={handleSaveDefaults}
              disabled={saveStatus === 'saving' || hasErrors}
              title="自社情報をこのブラウザに保存します（外部送信なし）"
              className={`flex-1 md:flex-none flex justify-center items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors ${hasErrors ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200' : 'text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border-gray-200'}`}
            >
              {saveStatus === 'saving' ? (
                <Cloud size={18} className="animate-pulse text-blue-600" />
              ) : saveStatus === 'saved' ? (
                <Check size={18} className="text-green-600" />
              ) : (
                <Save size={18} />
              )}
              <span>
                {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '保存完了' : '自社情報を記憶'}
              </span>
            </button>
            <button
              onClick={handlePrint}
              disabled={hasErrors}
              className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-5 py-2.5 rounded-lg transition-colors shadow-sm font-medium ${hasErrors ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              title={hasErrors ? "エラー項目があるため印刷できません" : ""}
            >
              <Printer size={20} />
              <span>PDF出力・印刷</span>
            </button>
          </div>
        </div>

        {hasErrors && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-red-800">入力内容にエラーがあります</p>
              <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <p className="text-xs text-red-600 mt-2">※未入力の必須項目をすべて埋めると、印刷機能が利用できるようになります。</p>
            </div>
          </div>
        )}

        {/* 1. 基本情報ブロック（100%幅 3列構成） */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

            {/* 1列目：請求情報 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">請求日</label>
                <input
                  type="date"
                  name="date"
                  value={basicInfo.date}
                  onChange={handleBasicInfoChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  お支払期限 <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={basicInfo.dueDate}
                  onChange={handleBasicInfoChange}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.dueDate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">請求書番号</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={basicInfo.invoiceNumber}
                  onChange={handleBasicInfoChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">宛名</label>
                  <div className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md text-gray-600 font-bold select-none">
                    株式会社トピカ
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">※この項目は固定されています</p>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">敬称</label>
                  <select
                    name="billToSuffix"
                    value={basicInfo.billToSuffix}
                    onChange={handleBasicInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="御中">御中</option>
                    <option value="様">様</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                <input
                  type="text"
                  name="subject"
                  placeholder="2026年○月分 ○○案件 PR費用"
                  value={basicInfo.subject}
                  onChange={handleBasicInfoChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* 2列目：発行者情報 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">事業者区分</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50 flex-1">
                    <input
                      type="radio"
                      name="businessType"
                      value="tax-exempt"
                      checked={basicInfo.businessType === 'tax-exempt'}
                      onChange={handleBasicInfoChange}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">免税事業者</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50 flex-1">
                    <input
                      type="radio"
                      name="businessType"
                      value="qualified"
                      checked={basicInfo.businessType === 'qualified'}
                      onChange={handleBasicInfoChange}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">適格発行事業者</span>
                  </label>
                </div>
              </div>

              {basicInfo.businessType === 'qualified' && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    登録番号 <span className="text-[10px] text-white bg-red-500 px-1.5 py-0.5 rounded leading-none">必須</span>
                  </label>
                  <div className="flex items-stretch">
                    <span className="flex items-center justify-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-100 text-gray-600 font-medium">T</span>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={basicInfo.registrationNumber}
                      onChange={handleBasicInfoChange}
                      placeholder="1234567890123"
                      maxLength={13}
                      className={`w-full p-2 border rounded-r-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.registrationNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    />
                  </div>
                  {errors.registrationNumber && <p className="text-red-500 text-xs mt-1">{errors.registrationNumber}</p>}
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  屋号・氏名 <span className="text-[10px] text-white bg-red-500 px-1.5 py-0.5 rounded leading-none">必須</span>
                </label>
                <input
                  type="text"
                  name="myName"
                  placeholder="自社名 または 氏名"
                  value={basicInfo.myName}
                  onChange={handleBasicInfoChange}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.myName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.myName && <p className="text-red-500 text-xs mt-1">{errors.myName}</p>}
              </div>
            </div>

            {/* 3列目：住所・連絡先 */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-1">住所</h4>
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    郵便番号 <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    placeholder="100-0000"
                    value={basicInfo.postalCode}
                    onChange={handleBasicInfoChange}
                    className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.postalCode ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.postalCode && <p className="text-red-500 text-[11px] mt-1">{errors.postalCode}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    住所 <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    placeholder="東京都〇〇区〇〇 1-2-3"
                    value={basicInfo.address}
                    onChange={handleBasicInfoChange}
                    className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.address && <p className="text-red-500 text-[11px] mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">建物名・部屋番号 など</label>
                  <input
                    type="text"
                    name="buildingName"
                    placeholder="〇〇ビル 1F"
                    value={basicInfo.buildingName}
                    onChange={handleBasicInfoChange}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-1">連絡先</h4>
                <div className="flex flex-col gap-3">
                  <div className="w-full">
                    <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      Tel <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                    </label>
                    <input
                      type="tel"
                      name="tel"
                      placeholder="03-0000-0000"
                      value={basicInfo.tel}
                      onChange={handleBasicInfoChange}
                      className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.tel ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    />
                    {errors.tel && <p className="text-red-500 text-[11px] mt-1">{errors.tel}</p>}
                  </div>
                  <div className="w-full">
                    <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      Email <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="info@example.com"
                      value={basicInfo.email}
                      onChange={handleBasicInfoChange}
                      className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    />
                    {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 明細ブロック（100%幅） */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">明細</h2>

          {/* PC用 ヘッダー行 (見切れないように固定幅を広めに設定) */}
          <div className="hidden lg:flex gap-2 items-start mb-2 pr-12 text-sm font-medium text-gray-700">
            <div className="w-[130px] pl-1 flex-shrink-0">納品月</div>
            <div className="w-[160px] pl-1 flex-shrink-0">案件名</div>
            <div className="flex-1 pl-1 min-w-[150px]">品名</div>
            <div className="w-[60px] pl-1 text-center flex-shrink-0">数量</div>
            <div className="w-[210px] pl-1 text-center flex-shrink-0">単価{isTaxExempt ? '' : '(税抜)'}</div>
            {!isTaxExempt && <div className="w-[80px] pl-1 text-center flex-shrink-0">税率</div>}
            <div className="w-[40px] pl-1 text-center flex-shrink-0" title="源泉徴収税の対象にする場合はチェック">源泉</div>
          </div>

          {/* 明細の行 */}
          <div className="space-y-4 lg:space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex flex-col lg:flex-row gap-3 lg:gap-2 items-start lg:items-center bg-gray-50 lg:bg-transparent p-4 lg:p-0 rounded-lg border lg:border-none border-gray-100">
                <div className="flex-grow flex flex-col lg:flex-row gap-4 lg:gap-2 w-full items-start lg:items-center">
                  <div className="w-full lg:w-[130px] min-w-0 flex-shrink-0">
                    <label className="lg:hidden text-xs font-medium text-gray-500 mb-1 block">納品月</label>
                    <input
                      type="month"
                      value={item.deliveryMonth}
                      onChange={(e) => handleItemChange(item.id, 'deliveryMonth', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    />
                  </div>
                  <div className="w-full lg:w-[160px] min-w-0 flex-shrink-0">
                    <label className="lg:hidden text-xs font-medium text-gray-500 mb-1 block">案件名</label>
                    <input
                      type="text"
                      placeholder="案件名"
                      value={item.projectName}
                      onChange={(e) => handleItemChange(item.id, 'projectName', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-gray-400"
                    />
                  </div>
                  <div className="w-full lg:flex-1 min-w-0">
                    <label className="lg:hidden text-xs font-medium text-gray-500 mb-1 block">品名</label>
                    <input
                      type="text"
                      placeholder="項目名を入力してください。"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-gray-400"
                    />
                  </div>
                  <div className="w-full lg:w-[60px] min-w-0 flex-shrink-0">
                    <label className="lg:hidden text-xs font-medium text-gray-500 mb-1 block">数量</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-gray-400 lg:text-center"
                      min="1"
                    />
                  </div>
                  <div className="relative group flex flex-col w-full lg:w-[210px] min-w-0 flex-shrink-0">
                    <label className="lg:hidden text-xs font-medium text-gray-500 mb-1 block">単価{isTaxExempt ? '' : '(税抜)'}</label>
                    <div className="relative w-full">
                      <span className="absolute left-2 lg:left-3 top-2.5 text-gray-500 text-sm">¥</span>
                      <textarea
                        inputMode="text"
                        placeholder={getItemPricePlaceholder(item)}
                        value={item.price}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/[^0-9]/g, '');
                          const formattedValue = rawValue ? new Intl.NumberFormat('ja-JP').format(Number(rawValue)) : '';
                          handleItemChange(item.id, 'price', formattedValue);
                        }}
                        rows={1}
                        className={`w-full p-2 pl-6 lg:pl-7 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-gray-400 resize-none overflow-hidden ${
                          item.type === 'reimbursement'
                            ? (isTaxExempt ? 'min-h-[60px] placeholder:text-[10.5px] placeholder:leading-tight' : 'min-h-[80px] placeholder:text-[9.5px] placeholder:leading-tight')
                            : 'h-[40px] leading-relaxed'
                        }`}
                      />
                    </div>
                  </div>
                  {!isTaxExempt && (
                    <div className="w-full lg:w-[80px] min-w-0 flex-shrink-0">
                      <label className="lg:hidden text-xs font-medium text-gray-500 mb-1 block">税率</label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(item.id, 'taxRate', Number(e.target.value))}
                        className="w-full p-2 lg:p-1 xl:p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white lg:text-center"
                      >
                        <option value={10}>10%</option>
                        <option value={8}>8%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                  )}
                  <div className="w-full lg:w-[40px] flex flex-row lg:flex-col items-center justify-start lg:justify-center lg:h-[40px] min-w-0 flex-shrink-0">
                    <label className="lg:hidden text-xs font-medium text-gray-500 mr-2">源泉対象</label>
                    <input
                      type="checkbox"
                      title="源泉徴収税の対象にする場合はチェック"
                      checked={item.subjectToWithholding}
                      onChange={(e) => handleItemChange(item.id, 'subjectToWithholding', e.target.checked)}
                      className="w-5 h-5 lg:w-4 lg:h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0 mt-2 lg:mt-0 w-10 h-10 flex items-center justify-center"
                  disabled={items.length === 1}
                  title="この行を削除"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4 mt-6 lg:mt-4">
            <button
              onClick={addItem}
              className="flex justify-center items-center gap-1 text-sm text-blue-600 bg-blue-50 lg:bg-transparent hover:bg-blue-100 lg:hover:text-blue-800 font-medium py-2 lg:py-0 rounded-md lg:rounded-none transition-colors"
            >
              <Plus size={16} /> 明細を追加
            </button>
            <button
              onClick={addReimbursementItem}
              className="flex justify-center items-center gap-1 text-sm text-green-600 bg-green-50 lg:bg-transparent hover:bg-green-100 lg:hover:text-green-800 font-medium py-2 lg:py-0 rounded-md lg:rounded-none transition-colors"
            >
              <Plus size={16} /> 立替費を追加
            </button>
          </div>
        </div>

        {/* 3. 振込先・備考ブロック（100%幅 2列構成） */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">振込先・備考</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* 振込先 */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700">振込先口座情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    金融機関名 <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    placeholder="〇〇銀行"
                    value={basicInfo.bankName}
                    onChange={handleBasicInfoChange}
                    className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.bankName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.bankName && <p className="text-red-500 text-[11px] mt-1">{errors.bankName}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    支店名 <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                  </label>
                  <input
                    type="text"
                    name="branchName"
                    placeholder="〇〇支店"
                    value={basicInfo.branchName}
                    onChange={handleBasicInfoChange}
                    className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.branchName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.branchName && <p className="text-red-500 text-[11px] mt-1">{errors.branchName}</p>}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs text-gray-600 mb-1">口座種別</label>
                  <select
                    name="accountType"
                    value={basicInfo.accountType}
                    onChange={handleBasicInfoChange}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                  </select>
                </div>
                <div className="w-full md:w-2/3">
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    口座番号 <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="1234567"
                    maxLength={7}
                    value={basicInfo.accountNumber}
                    onChange={handleBasicInfoChange}
                    className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.accountNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.accountNumber && <p className="text-red-500 text-[11px] mt-1">{errors.accountNumber}</p>}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    口座名義（漢字） <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                </label>
                <input
                  type="text"
                  name="accountName"
                  placeholder="株式会社〇〇"
                  value={basicInfo.accountName}
                  onChange={handleBasicInfoChange}
                  className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.accountName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.accountName && <p className="text-red-500 text-[11px] mt-1">{errors.accountName}</p>}
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    口座名義（全角カナ） <span className="text-[10px] text-white bg-red-500 px-1 py-0.5 rounded leading-none">必須</span>
                </label>
                <input
                  type="text"
                  name="accountNameKana"
                  placeholder="カブシキガイシャマルマル"
                  value={basicInfo.accountNameKana}
                  onChange={handleBasicInfoChange}
                  className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 ${errors.accountNameKana ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.accountNameKana && <p className="text-red-500 text-[11px] mt-1">{errors.accountNameKana}</p>}
              </div>
            </div>

            {/* 備考 */}
            <div className="space-y-4 flex flex-col h-full">
              <h3 className="text-sm font-bold text-gray-700">備考</h3>
              <textarea
                name="note"
                value={basicInfo.note}
                onChange={handleBasicInfoChange}
                rows={6}
                className="flex-grow w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 leading-relaxed"
              />
            </div>
          </div>
        </div>

      </div>

      {/* レスポンシブA4印刷プレビュー領域 */}
      <div className="w-full overflow-x-auto print:overflow-visible print:m-0 pb-10 flex justify-center">
        <div
          className="relative print:!w-auto print:!h-auto print:!block"
          style={{
            width: `${794 * previewScale}px`,
            height: `${1123 * previewScale}px`,
            minWidth: `${794 * previewScale}px`
          }}
        >
          <div
            className="origin-top-left bg-white shadow-xl print:shadow-none print:m-0 absolute top-0 left-0 print:static print:!transform-none"
            style={{
              transform: `scale(${previewScale})`,
              width: '794px',
              minHeight: '1123px',
            }}
          >
            <div id="print-root" className="w-[794px] min-h-[1123px] px-[75px] py-[56px] text-gray-900 text-sm bg-white box-border mx-auto print:w-full print:min-h-0 print:h-auto">

              {/* ヘッダー部分 */}
              <div className="flex justify-between items-start mb-8">
                <div className="w-1/2 pt-2">
                  <h2 className="text-xl font-bold border-b-2 border-gray-800 pb-1 mb-1 inline-block min-w-[200px] min-h-[36px]">
                    株式会社トピカ {basicInfo.billToSuffix}
                  </h2>
                  <p className="mt-4 text-gray-600">下記の通りご請求申し上げます。</p>

                  {/* 件名の表示 */}
                  {basicInfo.subject && (
                    <div className="mt-4 mb-2 text-lg font-bold border-b border-gray-300 pb-1 inline-block min-w-[80%]">
                      件名：{basicInfo.subject}
                    </div>
                  )}

                  {/* 振込先情報の表示 */}
                  <div className="mt-6">
                    <h3 className="font-bold border-b border-gray-400 pb-1 mb-2">振込先</h3>
                    <div className="text-sm leading-relaxed min-h-[60px]">
                      {basicInfo.bankName || basicInfo.branchName || basicInfo.accountNumber || basicInfo.accountName || basicInfo.accountNameKana ? (
                        <>
                          <p>{basicInfo.bankName} {basicInfo.branchName}</p>
                          <p>{basicInfo.accountNumber ? `${basicInfo.accountType} ${basicInfo.accountNumber}` : ''}</p>
                          {basicInfo.accountName && <p>口座名義（漢字）: {basicInfo.accountName}</p>}
                          {basicInfo.accountNameKana && <p>口座名義（カナ）: {basicInfo.accountNameKana}</p>}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="w-1/2 text-right space-y-3">
                  <h1 className="text-3xl font-bold tracking-[0.2em] mb-4">請求書</h1>
                  <div className="text-right text-gray-700">
                    <p>請求日: {basicInfo.date.replace(/-/g, '/')}</p>
                    <p>請求番号: {basicInfo.invoiceNumber}</p>
                    {basicInfo.dueDate && <p>お支払期限: {basicInfo.dueDate.replace(/-/g, '/')}</p>}
                  </div>
                  <div className="text-right pt-2 min-h-[100px]">
                    <p className="font-bold text-lg mb-2">{basicInfo.myName}</p>
                    {basicInfo.businessType === 'qualified' && basicInfo.registrationNumber && (
                      <p className="text-gray-700 mb-2">登録番号: T{basicInfo.registrationNumber}</p>
                    )}
                    <div className="inline-block text-left text-gray-700 text-sm space-y-1">
                      {basicInfo.postalCode && <p>〒 {basicInfo.postalCode}</p>}
                      {basicInfo.address && <p>{basicInfo.address}</p>}
                      {basicInfo.buildingName && <p>{basicInfo.buildingName}</p>}
                      {(basicInfo.tel || basicInfo.email) && <div className="h-1"></div>}
                      {basicInfo.tel && <p>TEL: {basicInfo.tel}</p>}
                      {basicInfo.email && <p>Email: {basicInfo.email}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* ご請求金額 */}
              <div className="border-b-4 border-gray-800 pb-2 mb-6 flex items-end justify-between">
                <span className="text-lg font-bold">ご請求金額</span>
                <span className="text-3xl font-bold">
                  ￥{formatCurrency(totalAmount)}- <span className="text-sm font-normal text-gray-600 ml-1">(税込)</span>
                </span>
              </div>

              {/* 明細テーブル */}
              <div className="mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-800 text-sm">
                      <th className="py-2 px-1 text-left w-24">納品月</th>
                      <th className="py-2 px-1 text-left">品番・品名</th>
                      <th className="py-2 px-1 text-center w-12">数量</th>
                      <th className="py-2 px-1 text-right w-20">単価</th>
                      {!isTaxExempt && <th className="py-2 px-1 text-center w-14">税率</th>}
                      <th className="py-2 px-1 text-right w-24">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const itemPrice = Number(String(item.price).replace(/,/g, '')) || 0;
                      const itemTotal = itemPrice * (Number(item.quantity) || 0);

                      return (
                        <tr key={index} className="border-b border-gray-300 border-dotted text-sm">
                          <td className="py-2 px-1 text-gray-600">{item.deliveryMonth ? item.deliveryMonth.replace('-', '/') : ''}</td>
                          <td className="py-2 px-1">
                            {item.projectName && <span className="mr-2">{item.projectName}</span>}
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2 px-1 text-center">{item.quantity}</td>
                          <td className="py-2 px-1 text-right">{itemPrice > 0 ? `￥${formatCurrency(itemPrice)}` : ''}</td>
                          {!isTaxExempt && <td className="py-2 px-1 text-center">{item.taxRate === 0 ? '非課税' : `${item.taxRate}%`}</td>}
                          <td className="py-2 px-1 text-right">{itemTotal > 0 ? `￥${formatCurrency(itemTotal)}` : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 金額サマリーと備考 */}
              <div className="flex justify-between items-start gap-8 mt-6">
                <div className="w-1/2 space-y-6">
                  <div className="h-[90px]"></div>
                  <div>
                    <h3 className="font-bold border-b border-gray-400 pb-1 mb-2">備考</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed min-h-[40px]">{basicInfo.note}</p>
                  </div>
                </div>

                <div className="w-5/12">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="py-2 px-2 text-left font-medium text-gray-600">小計</td>
                        <td className="py-2 px-2 text-right">￥{formatCurrency(subtotal)}</td>
                      </tr>

                      {!isTaxExempt && (subtotal10 > 0 || tax10 > 0) && (
                        <React.Fragment>
                          <tr className="border-b border-gray-100 text-gray-600 text-xs">
                            <td className="py-1 px-2 text-left pl-4">10%対象</td>
                            <td className="py-1 px-2 text-right">￥{formatCurrency(subtotal10)}</td>
                          </tr>
                          <tr className="border-b border-gray-300 text-gray-600 text-xs">
                            <td className="py-1 px-2 text-left pl-4">消費税 (10%)</td>
                            <td className="py-1 px-2 text-right">￥{formatCurrency(tax10)}</td>
                          </tr>
                        </React.Fragment>
                      )}

                      {!isTaxExempt && (subtotal8 > 0 || tax8 > 0) && (
                        <React.Fragment>
                          <tr className="border-b border-gray-100 text-gray-600 text-xs">
                            <td className="py-1 px-2 text-left pl-4">8%対象 (軽減税率)</td>
                            <td className="py-1 px-2 text-right">￥{formatCurrency(subtotal8)}</td>
                          </tr>
                          <tr className="border-b border-gray-300 text-gray-600 text-xs">
                            <td className="py-1 px-2 text-left pl-4">消費税 (8%)</td>
                            <td className="py-1 px-2 text-right">￥{formatCurrency(tax8)}</td>
                          </tr>
                        </React.Fragment>
                      )}

                      {!isTaxExempt && subtotal0 > 0 && (
                        <tr className="border-b border-gray-300 text-gray-600 text-xs">
                          <td className="py-1 px-2 text-left pl-4">非課税対象</td>
                          <td className="py-1 px-2 text-right">￥{formatCurrency(subtotal0)}</td>
                        </tr>
                      )}

                      {withholdingTax > 0 && (
                        <tr className="border-b border-gray-300 text-red-600">
                          <td className="py-2 px-2 text-left font-medium">源泉徴収税 (10.21%)</td>
                          <td className="py-2 px-2 text-right">-￥{formatCurrency(withholdingTax)}</td>
                        </tr>
                      )}
                      <tr className="border-b-2 border-gray-800 font-bold text-lg">
                        <td className="py-3 px-2 text-left">合計</td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          ￥{formatCurrency(totalAmount)}
                          {!isTaxExempt && <span className="text-xs font-normal text-gray-600 ml-1">(税込)</span>}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
