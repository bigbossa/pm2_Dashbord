import React, { useState, useEffect, useRef } from 'react';
import { MapPin, DollarSign, Activity, Save, Navigation, Fuel, FileText, Home, Plus, Trash2, Clock, CheckCircle, PlayCircle, StopCircle, RefreshCw, Camera, X, ArrowLeft, Download, Map, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesCRM = () => {
  // --- Global State ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [mileage, setMileage] = useState(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('crm_mileage');
    return saved ? JSON.parse(saved) : { 
      start: '', 
      end: '', 
      distance: 0, 
      startTime: null, 
      endTime: null,
      isStarted: false,
      isFinished: false,
      dailyLogId: null,
      startImage: null,
      endImage: null
    };
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('crm_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [checkIns, setCheckIns] = useState(() => {
    const saved = localStorage.getItem('crm_checkins');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Form Inputs State
  const [expenseForm, setExpenseForm] = useState({ type: 'Fuel', amount: '', note: '', liters: '', image: null });
  const [checkInForm, setCheckInForm] = useState({ 
    customer: '', 
    note: '',
    project: '',
    contact: '',
    phone: '',
    customertype: 'รับเหมาก่อสร้าง',
    target: 'นำเสนอ',
    type: 'คอนกรีตผสมเสร็จ',
    typeproduct: 'RMC',
    budget: '',
    images: []
  });

  const [customerList, setCustomerList] = useState([]);

  // Notifications
  const [notification, setNotification] = useState(null);

  // Summary State
  const [summaryData, setSummaryData] = useState([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef(null);
  const [ocrTarget, setOcrTarget] = useState(null); // 'start' or 'end'
  
  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalForm, setExpenseModalForm] = useState({ type: 'Fuel', amount: '', liters: '', image: null });
  const [modalDailyLogId, setModalDailyLogId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [videoTrack, setVideoTrack] = useState(null);

  // --- Effects for Persistence ---
  useEffect(() => {
    localStorage.setItem('crm_user', JSON.stringify(user));
    
    // Restore state from DB when user logs in
    if (user) {
      fetchTodayState(user.id);
    }
  }, [user]);

  // Using localStorage for state persistence (simple storage)
  useEffect(() => {
    localStorage.setItem('crm_mileage', JSON.stringify(mileage));
  }, [mileage]);

  useEffect(() => {
    localStorage.setItem('crm_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('crm_checkins', JSON.stringify(checkIns));
  }, [checkIns]);

  // Fetch customers for autocomplete
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/ycsalescrm/api/customers');
        if (res.ok) {
          const data = await res.json();
          setCustomerList(data);
        }
      } catch (err) {
        console.error('Failed to fetch customers', err);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch summary when tab changes to summary
  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
    }
  }, [activeTab]);

  // --- Helpers ---
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  };

  const calculateDistance = () => {
    if (mileage.start && mileage.end) {
      return Math.max(0, parseInt(mileage.end) - parseInt(mileage.start));
    }
    return 0;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const compressBase64 = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if too large (max 1920px)
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to approx 2MB
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Reduce quality until size is under 2MB
        const MAX_CHAR_LENGTH = 2 * 1024 * 1024 * 1.37; 
        
        while (dataUrl.length > MAX_CHAR_LENGTH && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(dataUrl);
      };
    });
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (event) => {
        const compressed = await compressBase64(event.target.result);
        resolve(compressed);
      };
    });
  };

  const handleAddImage = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    showNotification('⏳ กำลังประมวลผลรูปภาพ...');
    
    for (const file of files) {
        try {
            const compressedBase64 = await compressImage(file);
            setCheckInForm(prev => ({
                ...prev,
                images: [...prev.images, compressedBase64]
            }));
        } catch (error) {
            console.error("Image compression error:", error);
            showNotification('❌ รูปภาพบางรูปมีปัญหา');
        }
    }
  };

  const removeImage = (index) => {
    setCheckInForm(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // --- Handlers ---

  const handleStartDay = async () => {
    if (!mileage.start) {
      showNotification('⚠️ กรุณากรอกเลขไมล์เริ่มต้น');
      return;
    }

    try {
      const response = await fetch('/ycsalescrm/api/daily-logs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          start_mileage: parseInt(mileage.start),
          image: mileage.startImage
        })
      });

      if (!response.ok) throw new Error('Failed to start day');
      
      const data = await response.json();

      setMileage({
        ...mileage,
        isStarted: true,
        startTime: new Date(),
        dailyLogId: data.id
      });
      showNotification('🚗 เริ่มงานแล้ว! เดินทางปลอดภัยครับ');
      setActiveTab('dashboard');
    } catch (error) {
      console.error(error);
      showNotification('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
    }
  };

  const handleEndDay = async () => {
    if (!mileage.end) {
      showNotification('⚠️ กรุณากรอกเลขไมล์สิ้นสุด');
      return;
    }
    if (parseInt(mileage.end) < parseInt(mileage.start)) {
      showNotification('⚠️ เลขไมล์สิ้นสุดต้องมากกว่าเริ่มต้น');
      return;
    }

    if (!mileage.dailyLogId) {
      console.error('Missing Daily Log ID', mileage);
      showNotification('⚠️ ไม่พบข้อมูลการเริ่มงาน (Log ID Missing)');
      return;
    }

    try {
      console.log('Ending day for Log ID:', mileage.dailyLogId);
      const response = await fetch(`/ycsalescrm/api/daily-logs/${mileage.dailyLogId}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_mileage: parseInt(mileage.end),
          image: mileage.endImage
        })
      });

      if (!response.ok) throw new Error('Failed to end day');
      
      const data = await response.json();
      
      setMileage({
        ...mileage,
        isFinished: true,
        endTime: new Date(),
        distance: parseInt(mileage.end) - parseInt(mileage.start)
      });
      showNotification('🏁 จบงานเรียบร้อย ขอบคุณครับ');
      setActiveTab('dashboard');
    } catch (error) {
      console.error(error);
      showNotification('❌ ไม่สามารถบันทึกจบงานได้');
    }
  };

  const handleResetDay = () => {
    // Custom modal confirmation instead of window.confirm
    // We use a simple window.confirm here for ease of demonstration in Node environment
    if (window.confirm('ต้องการเริ่มวันใหม่ใช่หรือไม่? ข้อมูลวันนี้จะถูกล้าง')) {
      const newState = { 
        start: '', 
        end: '', 
        distance: 0, 
        startTime: null, 
        endTime: null,
        isStarted: false,
        isFinished: false
      };
      setMileage(newState);
      setExpenses([]);
      setCheckIns([]);
      showNotification('🔄 เริ่มวันใหม่เรียบร้อย');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    
    // Check if day has been started
    if (!mileage.isStarted || !mileage.dailyLogId) {
      showNotification('⚠️ กรุณาเริ่มงานในหน้าไมล์ก่อนบันทึกค่าใช้จ่าย');
      return;
    }
    
    try {
      const response = await fetch('/ycsalescrm/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          daily_log_id: mileage.dailyLogId,
          expense_type: expenseForm.type,
          amount: parseFloat(expenseForm.amount),
          note: expenseForm.note,
          liters: expenseForm.liters ? parseFloat(expenseForm.liters) : null,
          image: expenseForm.image
        })
      });

      if (!response.ok) throw new Error('Failed to add expense');
      
      const data = await response.json();

      const newExpense = {
        id: data.id,
        type: data.expense_type,
        amount: data.amount,
        note: data.note,
        liters: data.liters,
        image: data.receipt_image_url,
        timestamp: new Date(data.created_at)
      };
      setExpenses([newExpense, ...expenses]);
      setExpenseForm({ type: 'Fuel', amount: '', note: '', liters: '', image: null });
      showNotification('บันทึกค่าใช้จ่ายแล้ว');
    } catch (error) {
      console.error(error);
      showNotification('❌ ไม่สามารถบันทึกค่าใช้จ่ายได้');
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInForm.customer) return;

    showNotification('📍 กำลังระบุตำแหน่ง GPS...');

    if (!navigator.geolocation) {
      showNotification('❌ อุปกรณ์ไม่รองรับ GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const response = await fetch('/ycsalescrm/api/check-ins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            daily_log_id: mileage.dailyLogId,
            customer_name_temp: checkInForm.customer,
            notes: checkInForm.note,
            latitude: latitude,
            longitude: longitude,
            customertype: checkInForm.customertype,
            target: checkInForm.target,
            type: checkInForm.type,
            typeproduct: checkInForm.typeproduct,
            budget: checkInForm.budget ? parseFloat(checkInForm.budget) : 0,
            image: JSON.stringify(checkInForm.images),
            contact: checkInForm.contact,
            phone: checkInForm.phone,
            project: checkInForm.project
          })
        });

        if (!response.ok) throw new Error('Failed to check in');
        
        const data = await response.json();

        const newCheckIn = {
          id: data.id,
          customer: data.customer_name_temp,
          note: data.notes,
          timestamp: new Date(data.check_in_time),
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          images: data.image ? JSON.parse(data.image) : [],
          latitude: latitude,
          longitude: longitude
        };
        setCheckIns([newCheckIn, ...checkIns]);

        // Update customer list if new
        if (!customerList.includes(newCheckIn.customer)) {
            setCustomerList(prev => [...prev, newCheckIn.customer].sort());
        }

        setCheckInForm({ 
            customer: '', 
            note: '',
            project: '',
            contact: '',
            phone: '',
            customertype: 'รับเหมาก่อสร้าง',
            target: 'นำเสนอ',
            type: 'คอนกรีตผสมเสร็จ',
            typeproduct: 'RMC',
            budget: '',
            images: []
        });
        showNotification('✅ เช็คอินเรียบร้อย');
      } catch (error) {
        console.error(error);
        showNotification('❌ ไม่สามารถบันทึกเช็คอินได้');
      }
    }, (error) => {
      console.error("GPS Error:", error);
      showNotification('❌ ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS');
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  };

  const deleteExpense = async (id, refreshLogId = null) => {
    if (refreshLogId) {
      // ลบ expense จากวันที่เลือกดู
      try {
        const response = await fetch(`/ycsalescrm/api/expenses/${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete expense');
        showNotification('✅ ลบรายการเรียบร้อย');
        // Refresh log details and summary list
        await fetchLogDetails(refreshLogId);
        await fetchSummary();
      } catch (error) {
        console.error(error);
        showNotification('❌ ไม่สามารถลบรายการได้');
      }
    } else {
      // ลบ expense จากวันปัจจุบัน (local state)
      setExpenses(expenses.filter(ex => ex.id !== id));
    }
  };

  const fetchSummary = async () => {
    if (!user) return;
    setIsLoadingSummary(true);
    try {
      const response = await fetch(`/ycsalescrm/api/daily-logs?user_id=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error(error);
      showNotification('❌ ไม่สามารถดึงข้อมูลสรุปได้');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const fetchLogDetails = async (id) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/ycsalescrm/api/daily-logs/${id}/details`);
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      console.log('📊 Log Details:', data);
      console.log('💰 Expenses:', data.expenses);
      data.expenses.forEach((ex, idx) => {
        console.log(`Expense ${idx}:`, {
          id: ex.id,
          expense_type: ex.expense_type,
          type: ex.type,
          amount: ex.amount,
          image: ex.image,
          receipt_image_url: ex.receipt_image_url,
          hasImage: !!(ex.image || ex.receipt_image_url),
          allKeys: Object.keys(ex)
        });
      });
      setSelectedLogDetails(data);
    } catch (error) {
      console.error(error);
      showNotification('❌ ไม่สามารถดึงรายละเอียดได้');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchTodayState = async (userId) => {
    try {
      const response = await fetch(`/ycsalescrm/api/today-state?user_id=${userId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.hasData) {
        setMileage(data.mileage);
        setCheckIns(data.checkIns);
        setExpenses(data.expenses);
        showNotification('🔄 โหลดข้อมูลล่าสุดเรียบร้อย');
      }
    } catch (error) {
      console.error('Error fetching today state:', error);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch('/ycsalescrm/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const userData = await response.json();
      setUser(userData);
      showNotification(`ยินดีต้อนรับ, ${userData.usersname || userData.username}`);
    } catch (error) {
      console.error(error);
      showNotification('❌ เข้าสู่ระบบไม่สำเร็จ: ' + error.message);
    }
  };

  const handleLogout = () => {
    if (window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
      setUser(null);
      setMileage({ 
        start: '', 
        end: '', 
        distance: 0, 
        startTime: null, 
        endTime: null,
        isStarted: false,
        isFinished: false,
        dailyLogId: null
      });
      setExpenses([]);
      setCheckIns([]);
      setActiveTab('dashboard');
    }
  };

  const processOCRImage = async (base64Image, target = ocrTarget) => {
    setIsProcessingOCR(true);
    showNotification('📷 กำลังอ่านค่าจากรูปภาพ...');

    try {
      // 1. OCR with Original Image (High Quality)
      const response = await fetch('/ycsalescrm/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      if (!response.ok) throw new Error('OCR Failed');

      const data = await response.json();
      
      // 2. Compress Image for Storage (Max 2MB)
      const compressedImage = await compressBase64(base64Image);

      if (target === 'start') {
        setMileage(prev => ({ ...prev, start: data.number, startImage: compressedImage }));
      } else if (target === 'end') {
        setMileage(prev => ({ ...prev, end: data.number, endImage: compressedImage }));
      }
      
      showNotification(`✅ อ่านค่าได้: ${data.number}`);
    } catch (error) {
      console.error(error);
      showNotification('❌ อ่านค่าไม่สำเร็จ กรุณากรอกเอง');
    } finally {
      setIsProcessingOCR(false);
      setOcrTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      processOCRImage(reader.result);
    };
  };

  const startCamera = async (target) => {
    setOcrTarget(target);
    setShowCamera(true);
    setZoom(1);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Get video track for zoom capabilities
      const track = stream.getVideoTracks()[0];
      setVideoTrack(track);

      const capabilities = track.getCapabilities();
      if (capabilities.zoom) {
        setMaxZoom(capabilities.zoom.max);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      showNotification('❌ ไม่สามารถเปิดกล้องได้ (ต้องใช้ HTTPS หรือ Localhost)');
      setShowCamera(false);
      setOcrTarget(null);
    }
  };

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    if (videoTrack) {
      videoTrack.applyConstraints({
        advanced: [{ zoom: newZoom }]
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setOcrTarget(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Frame dimensions (w-80 = 320px, h-28 = 112px)
      // We add some padding to ensure we capture the whole number
      const frameWidth = 320;
      const frameHeight = 112;
      
      // Calculate how the video is rendered on screen (object-cover)
      const videoRatio = video.videoWidth / video.videoHeight;
      const screenRatio = video.clientWidth / video.clientHeight;
      
      let renderWidth, renderHeight;
      
      if (screenRatio > videoRatio) {
          // Screen is wider than video aspect ratio -> Video is fit to width, cropped top/bottom
          renderWidth = video.clientWidth;
          renderHeight = renderWidth / videoRatio;
      } else {
          // Screen is taller than video aspect ratio -> Video is fit to height, cropped left/right
          renderHeight = video.clientHeight;
          renderWidth = renderHeight * videoRatio;
      }
      
      // Calculate scale factor (Source Pixels per Screen Pixel)
      const scale = video.videoWidth / renderWidth;
      
      // Calculate crop dimensions in source pixels (with 20% padding)
      const cropWidth = frameWidth * scale * 1.2; 
      const cropHeight = frameHeight * scale * 1.5; 
      
      // Center crop
      const sourceX = (video.videoWidth - cropWidth) / 2;
      const sourceY = (video.videoHeight - cropHeight) / 2;
      
      // Set canvas to crop size
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      const context = canvas.getContext('2d');
      
      // Apply zoom if needed (if digital zoom was simulated via canvas, but here we use hardware zoom if available)
      // If hardware zoom is used, video.videoWidth/Height already reflects the zoomed stream? 
      // No, getUserMedia zoom usually affects the stream itself.
      
      context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      const base64Image = canvas.toDataURL('image/jpeg');
      
      // Capture current target before stopping camera
      const currentTarget = ocrTarget;
      
      stopCamera();
      processOCRImage(base64Image, currentTarget);
    }
  };

  const triggerCamera = (target) => {
    startCamera(target);
  };

  // --- Components ---

  const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const onSubmit = (e) => {
      e.preventDefault();
      handleLogin(username, password);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
              <img src="/logo/YONG.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Sales CRM</h1>
            <p className="text-slate-500 text-sm">เข้าสู่ระบบเพื่อเริ่มงาน</p>
          </div>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ชื่อผู้ใช้</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">รหัสผ่าน</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Password"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-transform"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  };

  const Dashboard = () => (
    <div className="space-y-4 pb-20">
      <div className={`rounded-2xl p-6 text-white shadow-lg transition-colors ${mileage.isFinished ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}>
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold mb-1">สวัสดี, {user ? (user.usersname || user.username) : 'เซลล์แมน'}</h2>
                <p className="text-blue-100 text-sm">
                    {mileage.isFinished ? 'จบงานวันนี้แล้ว' : mileage.isStarted ? 'กำลังปฏิบัติงาน' : 'ยังไม่เริ่มงาน'}
                </p>
            </div>
            {mileage.isFinished && <CheckCircle className="w-8 h-8 text-green-200" />}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div>
            <div className="text-2xl font-bold">{calculateDistance()}</div>
            <div className="text-xs text-blue-100">กม. ที่วิ่ง</div>
          </div>
          <div className="border-l border-blue-400">
            <div className="text-2xl font-bold">{checkIns.length}</div>
            <div className="text-xs text-blue-100">จุดเช็คอิน</div>
          </div>
          <div className="border-l border-blue-400">
            <div className="text-2xl font-bold">{calculateTotalExpenses().toLocaleString()}</div>
            <div className="text-xs text-blue-100">บาท (คชจ.)</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-500" />
          เวลาปฏิบัติงาน
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
            <div className="flex flex-col">
                <span className="text-slate-500 text-xs uppercase">เวลาเริ่มงาน</span>
                <span className="text-slate-800 font-medium">{formatTime(mileage.startTime)} น.</span>
            </div>
            <div className="text-right">
                <span className="text-slate-500 text-xs block">เลขไมล์</span>
                <span className="font-mono font-bold text-slate-700">{mileage.start || '-'}</span>
            </div>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
            <div className="flex flex-col">
                <span className="text-slate-500 text-xs uppercase">เวลาเลิกงาน</span>
                <span className="text-slate-800 font-medium">{formatTime(mileage.endTime)} น.</span>
            </div>
            <div className="text-right">
                <span className="text-slate-500 text-xs block">เลขไมล์</span>
                <span className="font-mono font-bold text-slate-700">{mileage.end || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-green-500" />
          เช็คอินล่าสุด
        </h3>
        {checkIns.length === 0 ? (
          <p className="text-center text-slate-400 py-4 text-sm">ยังไม่มีการเช็คอินวันนี้</p>
        ) : (
          <div className="space-y-3">
            {checkIns.slice(0, 3).map(check => (
              <div key={check.id} className="flex items-start border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">{check.customer}</div>
                  <div className="text-xs text-slate-500">{formatTime(check.timestamp)} • {check.note || 'ไม่มีหมายเหตุ'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const MileageScreen = () => {
    // State 1: ยังไม่เริ่มงาน
    if (!mileage.isStarted) {
        return (
            <div className="space-y-6 pb-20 pt-10 px-4">
                <div className="text-center space-y-2">
                    <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PlayCircle className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">เริ่มงานวันใหม่</h2>
                    <p className="text-slate-500">กรอกเลขไมล์ปัจจุบันเพื่อเริ่มต้นการบันทึก</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <label className="block text-sm font-medium text-slate-600 mb-2">เลขไมล์เริ่มต้น (Start Mileage)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={mileage.start}
                            onChange={(e) => setMileage({...mileage, start: e.target.value})}
                            className="w-full pl-10 pr-14 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-mono"
                            placeholder="00000"
                            autoFocus
                        />
                        <Navigation className="w-5 h-5 text-slate-400 absolute left-3 top-5" />
                        <button 
                            onClick={() => triggerCamera('start')}
                            disabled={isProcessingOCR}
                            className="absolute right-3 top-3 p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                            {isProcessingOCR ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleStartDay}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex justify-center items-center text-lg"
                >
                    <PlayCircle className="w-6 h-6 mr-2" />
                    ยืนยันเริ่มงาน
                </button>
            </div>
        );
    }

    // State 3: จบงานแล้ว
    if (mileage.isFinished) {
        return (
            <div className="space-y-6 pb-20 pt-10 px-4">
                 <div className="text-center space-y-2">
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">จบงานเรียบร้อย</h2>
                    <p className="text-slate-500">สรุปข้อมูลการเดินทางวันนี้</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                        <span className="text-slate-500">ระยะทางรวม</span>
                        <span className="text-2xl font-bold text-blue-600">{mileage.distance} <span className="text-sm font-normal text-slate-400">กม.</span></span>
                    </div>
                    <div className="p-4 grid grid-cols-2 divide-x divide-slate-100">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">เริ่มงาน</div>
                            <div className="font-mono font-medium">{mileage.start}</div>
                            <div className="text-xs text-slate-500 mt-1">{formatTime(mileage.startTime)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">เลิกงาน</div>
                            <div className="font-mono font-medium">{mileage.end}</div>
                            <div className="text-xs text-slate-500 mt-1">{formatTime(mileage.endTime)}</div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleResetDay}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold active:scale-95 transition-transform flex justify-center items-center hover:bg-slate-200"
                >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    เริ่มวันใหม่ (Reset)
                </button>
            </div>
        )
    }

    // State 2: กำลังทำงาน
    return (
        <div className="space-y-4 pb-20 pt-6 px-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                    <span className="text-blue-600 text-xs font-bold uppercase tracking-wide">สถานะปัจจุบัน</span>
                    <div className="font-bold text-blue-800 flex items-center mt-1">
                        <Activity className="w-4 h-4 mr-2 animate-pulse" /> กำลังปฏิบัติงาน
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-blue-400 text-xs">เริ่มเมื่อ</span>
                    <div className="text-blue-800 font-mono">{formatTime(mileage.startTime)}</div>
                </div>
            </div>
        
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 opacity-70 pointer-events-none">
                <label className="block text-sm font-medium text-slate-400 mb-2">เลขไมล์เริ่มต้น (บันทึกแล้ว)</label>
                <div className="relative">
                <input 
                    type="number" 
                    value={mileage.start}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-lg font-mono"
                />
                <Navigation className="w-5 h-5 text-slate-300 absolute left-3 top-3.5" />
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
                <label className="block text-sm font-medium text-slate-800 mb-2">เลขไมล์สิ้นสุด (End Mileage)</label>
                <div className="relative">
                    <input 
                        type="number" 
                        value={mileage.end}
                        onChange={(e) => setMileage({...mileage, end: e.target.value})}
                        className="w-full pl-10 pr-14 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg font-mono"
                        placeholder="กรอกเมื่อเลิกงาน"
                    />
                    <Navigation className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                    <button 
                        onClick={() => triggerCamera('end')}
                        disabled={isProcessingOCR}
                        className="absolute right-2 top-2 p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                        {isProcessingOCR ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </button>
                </div>
                <p className="text-xs text-orange-500 mt-2">* กรุณากรอกเลขไมล์เมื่อถึงที่หมายสุดท้ายหรือเลิกงาน</p>
            </div>

            <button 
                onClick={handleEndDay}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-transform flex justify-center items-center mt-6"
            >
                <StopCircle className="w-5 h-5 mr-2" />
                บันทึก & จบงาน
            </button>
        </div>
    );
  };

  const CheckInScreen = () => (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold text-slate-800">เช็คอินลูกค้า</h2>
      
      {!mileage.isStarted && !mileage.isFinished && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            อย่าลืมกด "เริ่มงาน" ในหน้าไมล์ก่อนนะครับ
        </div>
      )}
      
      <form onSubmit={handleCheckIn} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-4">
        
        {/* 1. Group & 2. Target */}
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">กลุ่มลูกค้า</label>
                <select 
                    value={checkInForm.customertype}
                    onChange={(e) => setCheckInForm({...checkInForm, customertype: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                    {['รับเหมาก่อสร้าง', 'หมู่บ้าน', 'ขายโครงการ', 'อื่น'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">จุดมุ่งหมาย</label>
                <select 
                    value={checkInForm.target}
                    onChange={(e) => setCheckInForm({...checkInForm, target: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                    {['นำเสนอ', 'สำรวจ'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* 3. Customer Name */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">ชื่อลูกค้า</label>
          <input 
            type="text" 
            list="customer-list"
            value={checkInForm.customer}
            onChange={(e) => setCheckInForm({...checkInForm, customer: e.target.value})}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="ค้นหา หรือ พิมพ์ชื่อลูกค้าใหม่"
            required
          />
          <datalist id="customer-list">
            {customerList.map((name, index) => (
              <option key={index} value={name} />
            ))}
          </datalist>
        </div>

        {/* 4. Product Type & 5. Product Group */}
        {checkInForm.target !== 'สำรวจ' && (
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">ประเภทสินค้า</label>
                <select 
                    value={checkInForm.type}
                    onChange={(e) => setCheckInForm({...checkInForm, type: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                    {['คอนกรีตผสมเสร็จ', 'งานรั้ว', 'เสาเข็ม', 'เสาไฟฟ้า', 'แผ่นพื้น', 'ท่อ', 'เสาตอม่อ', 'ขอบคันหิน', 'อื่นๆ'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">กลุ่มสินค้า</label>
                <select 
                    value={checkInForm.typeproduct}
                    onChange={(e) => setCheckInForm({...checkInForm, typeproduct: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                    {['RMC', 'CCP', 'งานโครงการ'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
        )}

        {/* 6. Contact & 7. Phone */}
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">ชื่อผู้ติดต่อ</label>
                <input 
                    type="text" 
                    value={checkInForm.contact}
                    onChange={(e) => setCheckInForm({...checkInForm, contact: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="คุณสมชาย"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">เบอร์โทร</label>
                <input 
                    type="tel" 
                    value={checkInForm.phone}
                    onChange={(e) => setCheckInForm({...checkInForm, phone: e.target.value})}
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="08x-xxx-xxxx"
                />
            </div>
        </div>

        {/* 8. Project & 9. Site */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">โครงการ / สถานที่ก่อสร้าง</label>
          <input 
            type="text" 
            value={checkInForm.project}
            onChange={(e) => setCheckInForm({...checkInForm, project: e.target.value})}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="ชื่อโครงการ และ สถานที่"
          />
        </div>

        {/* 10. Budget */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">มูลค่าโครงการ (Budget)</label>
          <div className="relative">
            <input 
                type="number" 
                value={checkInForm.budget}
                onChange={(e) => setCheckInForm({...checkInForm, budget: e.target.value})}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
            />
            <span className="absolute left-3 top-3.5 text-slate-400 text-lg font-bold">฿</span>
          </div>
        </div>

        {/* 11. Note */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">รายละเอียด</label>
          <textarea 
            value={checkInForm.note}
            onChange={(e) => setCheckInForm({...checkInForm, note: e.target.value})}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 h-24"
            placeholder="รายละเอียดเพิ่มเติม..."
          ></textarea>
        </div>

        {/* 12. Images */}
        <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">รูปถ่ายหน้างาน ({checkInForm.images.length})</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {checkInForm.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                        <img src={img} alt="preview" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                        <button 
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">เพิ่มรูป</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleAddImage} />
                </label>
            </div>
        </div>
        
        <button type="submit" className="w-full bg-green-500 text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-600 active:scale-95 transition-transform flex justify-center items-center">
          <MapPin className="w-5 h-5 mr-2" />
          เช็คอินทันที
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">ประวัติวันนี้ ({checkIns.length})</h3>
        {checkIns.map((check) => (
          <div key={check.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-slate-800">{check.customer}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded mr-2">{formatTime(check.timestamp)}</span>
                        {check.note}
                    </div>
                </div>
                <div 
                    className="text-green-500 bg-green-50 p-2 rounded-full cursor-pointer hover:bg-green-100 active:scale-95 transition-transform"
                    onClick={() => {
                        if (check.latitude && check.longitude) {
                            window.open(`https://www.google.com/maps?q=${check.latitude},${check.longitude}`, '_blank');
                        } else {
                            showNotification('❌ ไม่พบพิกัด GPS');
                        }
                    }}
                >
                    <MapPin className="w-5 h-5" />
                </div>
            </div>
            
            {/* Image Gallery */}
            {check.images && check.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
                    {check.images.map((img, idx) => (
                        <img 
                            key={idx} 
                            src={img} 
                            alt={`Check-in ${idx + 1}`} 
                            className="w-16 h-16 object-cover rounded-lg border border-slate-100 flex-shrink-0"
                            onClick={() => {
                                const w = window.open("");
                                w.document.write(`<img src="${img}" style="max-width:100%; height:auto;">`);
                            }}
                        />
                    ))}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const handleExpenseModalImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showNotification('⏳ กำลังประมวลผลรูปภาพ...');
    try {
        const compressed = await compressImage(file);
        setExpenseModalForm(prev => ({ ...prev, image: compressed }));
        showNotification('✅ เพิ่มรูปใบเสร็จแล้ว');
    } catch (error) {
        console.error(error);
        showNotification('❌ ไม่สามารถเพิ่มรูปได้');
    }
  };

  const handleAddExpenseFromModal = async (e) => {
    e.preventDefault();
    
    if (!expenseModalForm.amount) {
      showNotification('⚠️ กรุณากรอกจำนวนเงิน');
      return;
    }
    
    try {
      if (editingExpenseId) {
        // Update existing expense
        const response = await fetch(`/ycsalescrm/api/expenses/${editingExpenseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expense_type: expenseModalForm.type,
            amount: parseFloat(expenseModalForm.amount),
            liters: expenseModalForm.liters ? parseFloat(expenseModalForm.liters) : null,
            image: expenseModalForm.image
          })
        });
        
        if (!response.ok) throw new Error('Failed to update expense');
        showNotification('✅ บันทึกการแก้ไขเรียบร้อย');
      } else {
        // Create new expense
        const response = await fetch('/ycsalescrm/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            daily_log_id: modalDailyLogId,
            expense_type: expenseModalForm.type,
            amount: parseFloat(expenseModalForm.amount),
            liters: expenseModalForm.liters ? parseFloat(expenseModalForm.liters) : null,
            image: expenseModalForm.image
          })
        });
        
        if (!response.ok) throw new Error('Failed to add expense');
        showNotification('✅ เพิ่มรายการเรียบร้อย');
      }
      
      setShowExpenseModal(false);
      setExpenseModalForm({ type: 'Fuel', amount: '', liters: '', image: null });
      setEditingExpenseId(null);
      
      // Refresh log details and summary list
      await fetchLogDetails(modalDailyLogId);
      await fetchSummary();
    } catch (error) {
      console.error(error);
      showNotification(editingExpenseId ? '❌ ไม่สามารถแก้ไขได้' : '❌ ไม่สามารถเพิ่มรายการได้');
    }
  };

  const ExpenseScreen = () => {
    const handleExpenseImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showNotification('⏳ กำลังประมวลผลรูปภาพ...');
        try {
            const compressed = await compressImage(file);
            setExpenseForm(prev => ({ ...prev, image: compressed }));
            showNotification('✅ เพิ่มรูปใบเสร็จแล้ว');
        } catch (error) {
            console.error(error);
            showNotification('❌ ไม่สามารถเพิ่มรูปได้');
        }
    };

    return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold text-slate-800">บันทึกค่าใช้จ่าย</h2>
      
      {!mileage.isStarted && !mileage.isFinished && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            อย่าลืมกด "เริ่มงาน" ในหน้าไมล์ก่อนนะครับ
        </div>
      )}
      
      <form onSubmit={handleAddExpense} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {['Fuel', 'Toll'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setExpenseForm({...expenseForm, type})}
              className={`p-3 rounded-lg text-sm font-medium border ${expenseForm.type === type ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {type === 'Fuel' ? 'ค่าน้ำมัน' : 'ทางด่วน'}
            </button>
          ))}
        </div>

        {expenseForm.type === 'Fuel' && (
            <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">จำนวนลิตร</label>
            <div className="relative">
                <input 
                type="number" 
                value={expenseForm.liters}
                onChange={(e) => setExpenseForm({...expenseForm, liters: e.target.value})}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                placeholder="0.00"
                step="0.01"
                />
                <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-bold">L</span>
            </div>
            </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">จำนวนเงิน (บาท)</label>
          <div className="relative">
            <input 
              type="number" 
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
              placeholder="0.00"
              required
            />
            <span className="absolute left-3 top-3.5 text-slate-400 text-lg font-bold">฿</span>
          </div>
        </div>

        {/* Image Upload */}
        <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">รูปใบเสร็จ</label>
            {expenseForm.image ? (
                <div className="relative w-full h-48">
                    <img src={expenseForm.image} alt="Receipt" className="w-full h-full object-contain rounded-lg border border-slate-200 bg-slate-50" />
                    <button 
                        type="button"
                        onClick={() => setExpenseForm(prev => ({ ...prev, image: null }))}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400">
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm">ถ่ายรูปใบเสร็จ</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleExpenseImage} />
                </label>
            )}
        </div>

        <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold shadow-md hover:bg-orange-600 active:scale-95 transition-transform flex justify-center items-center">
          <Plus className="w-5 h-5 mr-2" />
          เพิ่มรายการ
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">รายการวันนี้</h3>
        {expenses.map((ex) => (
          <div key={ex.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                <div className={`p-2 rounded-full mr-3 ${ex.type === 'Fuel' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {ex.type === 'Fuel' ? <Fuel className="w-4 h-4" /> : <span className="w-4 h-4 flex items-center justify-center font-bold text-sm">฿</span>}
                </div>
                <div>
                    <div className="font-medium text-slate-800">
                    {ex.type === 'Fuel' ? 'ค่าน้ำมัน' : 'ค่าทางด่วน'}
                    </div>
                    <div className="text-xs text-slate-400">{formatTime(ex.timestamp)}</div>
                </div>
                </div>
                <div className="flex items-center">
                <span className="font-bold text-slate-700 mr-3">{parseFloat(ex.amount).toLocaleString()} ฿</span>
                <button onClick={() => deleteExpense(ex.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                </button>
                </div>
            </div>
            
            {/* Details: Liters & Image */}
            <div className="pl-12 space-y-2">
                {ex.liters && (
                    <div className="text-sm text-slate-600 bg-slate-50 inline-block px-2 py-1 rounded">
                        ⛽ {ex.liters} ลิตร
                    </div>
                )}
                {ex.image && (
                    <img 
                        src={ex.image} 
                        alt="Receipt" 
                        className="h-20 object-cover rounded border border-slate-200 cursor-pointer"
                        onClick={() => window.open(ex.image, '_blank')}
                    />
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  };

  const handleExportPDF = async () => {
    if (!reportStartDate || !reportEndDate) {
      showNotification('❌ กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
      return;
    }

    setIsExporting(true);
    showNotification('⏳ กำลังสร้างรายงาน PDF...');

    try {
      const response = await fetch(`/ycsalescrm/api/reports?user_id=${user.id}&start_date=${reportStartDate}&end_date=${reportEndDate}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      
      const data = await response.json();
      
      if (data.length === 0) {
        showNotification('⚠️ ไม่พบข้อมูลในช่วงเวลาที่เลือก');
        setIsExporting(false);
        return;
      }

      const doc = new jsPDF();

      // Load Thai Font (Prompt-Regular & Bold)
      try {
        // Regular
        const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/prompt/Prompt-Regular.ttf';
        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        const fontBase64 = btoa(new Uint8Array(fontBytes).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        
        doc.addFileToVFS('Prompt-Regular.ttf', fontBase64);
        doc.addFont('Prompt-Regular.ttf', 'Prompt', 'normal');

        // Bold
        const fontUrlBold = 'https://raw.githubusercontent.com/google/fonts/main/ofl/prompt/Prompt-Bold.ttf';
        const fontBytesBold = await fetch(fontUrlBold).then(res => res.arrayBuffer());
        const fontBase64Bold = btoa(new Uint8Array(fontBytesBold).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        
        doc.addFileToVFS('Prompt-Bold.ttf', fontBase64Bold);
        doc.addFont('Prompt-Bold.ttf', 'Prompt', 'bold');

        doc.setFont('Prompt');
      } catch (fontError) {
        console.error('Error loading font:', fontError);
        showNotification('⚠️ ไม่สามารถโหลดฟอนต์ไทยได้ (ใช้ฟอนต์มาตรฐาน)');
      }
      
      // Helper to fetch image as base64
      const getImageBase64 = async (url) => {
        if (!url) return null;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error loading image:', url, error);
          return null;
        }
      };

      // Load Logo
      const logoBase64 = await getImageBase64('/logo/YONG.png');

      // Pre-load images
      for (const day of data) {
        for (const check of day.checkIns) {
            if (check.images && check.images.length > 0) {
                check.base64Image = await getImageBase64(check.images[0]);
            }
        }
        for (const expense of day.expenses) {
            // Support both property names (API inconsistency)
            const imgUrl = expense.image || expense.receipt_image_url;
            if (imgUrl) {
                expense.base64Image = await getImageBase64(imgUrl);
            }
        }
      }

      // Calculate Totals
      let totalDistance = 0;
      let totalFuel = 0;
      let totalToll = 0;

      data.forEach(day => {
        totalDistance += parseFloat(day.mileage.distance || 0);
        day.expenses.forEach(e => {
            if (e.expense_type === 'Fuel') totalFuel += parseFloat(e.amount || 0);
            else totalToll += parseFloat(e.amount || 0);
        });
      });

      doc.setFontSize(18);
      
      if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', 14, 12, 30, 12); // Logo
            doc.text('รายงานการทำงาน (Work Report)', 50, 20); // Shifted Title
        } catch (e) {
            doc.text('รายงานการทำงาน (Work Report)', 14, 22);
        }
      } else {
        doc.text('รายงานการทำงาน (Work Report)', 14, 22);
      }

      doc.setFontSize(11);
      doc.text(`ช่วงเวลา: ${new Date(reportStartDate).toLocaleDateString('th-TH')} ถึง ${new Date(reportEndDate).toLocaleDateString('th-TH')}`, 14, 32);
      doc.text(`พนักงาน: ${user.usersname || user.username}`, 14, 38);
      
      // Summary Section
      doc.setDrawColor(200);
      doc.line(14, 42, 196, 42);
      
      doc.setFontSize(10);
      doc.text(`ระยะทางรวม: ${totalDistance.toLocaleString()} กม.`, 14, 48);
      doc.text(`ค่าน้ำมันรวม: ${totalFuel.toLocaleString()} บาท`, 80, 48);
      doc.text(`ค่าทางด่วนรวม: ${totalToll.toLocaleString()} บาท`, 140, 48);
      
      doc.line(14, 52, 196, 52);

      let yPos = 60;

      data.forEach((day, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        const dateStr = new Date(day.date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 255);
        doc.text(`วันที่: ${dateStr}`, 14, yPos);
        yPos += 8;

        // Mileage
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`เลขไมล์: เริ่ม ${day.mileage.start} - จบ ${day.mileage.end || '-'} (ระยะทาง: ${day.mileage.distance} กม.)`, 14, yPos);
        yPos += 10;

        // Check-ins Table
        if (day.checkIns.length > 0) {
          doc.text('รายการเช็คอิน (Check-ins):', 14, yPos);
          yPos += 5;
          
          const checkInRows = day.checkIns.map(c => [
            new Date(c.check_in_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}),
            `${c.customer_name_temp || '-'}\n${c.project ? `(${c.project})` : ''}`,
            `${c.customertype || '-'}\n${c.target || '-'}\n${c.contact ? `ติดต่อ: ${c.contact}` : ''}`,
            c.notes || '-',
            c.base64Image || '' // Hidden image data
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['เวลา', 'ลูกค้า / โครงการ', 'รายละเอียด', 'หมายเหตุ', 'รูปภาพ']],
            body: checkInRows,
            margin: { left: 14 },
            theme: 'grid',
            styles: { fontSize: 8, font: 'Prompt', minCellHeight: 22, valign: 'middle', cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], font: 'Prompt', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 45 },
                2: { cellWidth: 45 },
                3: { cellWidth: 50 },
                4: { cellWidth: 25 }
            },
            didParseCell: (data) => {
                if (data.column.index === 4 && data.section === 'body') {
                    data.cell.customImages = data.cell.raw;
                    data.cell.text = []; // Clear text
                }
            },
            didDrawCell: (data) => {
                if (data.column.index === 4 && data.section === 'body' && data.cell.customImages) {
                    try {
                        const cellWidth = data.cell.width;
                        const cellHeight = data.cell.height;
                        const imgWidth = 20;
                        const imgHeight = 15;
                        const x = data.cell.x + (cellWidth - imgWidth) / 2;
                        const y = data.cell.y + (cellHeight - imgHeight) / 2;
                        doc.addImage(data.cell.customImages, 'JPEG', x, y, imgWidth, imgHeight);
                    } catch (e) { 
                        // Ignore image errors
                    }
                }
            }
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.text('ไม่มีการเช็คอิน', 14, yPos);
            yPos += 10;
        }

        // Expenses Table
        if (day.expenses.length > 0) {
          if (yPos > 250) { doc.addPage(); yPos = 20; }
          
          doc.text('ค่าใช้จ่าย (Expenses):', 14, yPos);
          yPos += 5;

          const expenseRows = day.expenses.map(e => [
            e.expense_type === 'Fuel' ? 'ค่าน้ำมัน' : 'ทางด่วน',
            `${e.note || '-'}\n${e.liters ? `(${e.liters} ลิตร)` : ''}`,
            parseFloat(e.amount).toLocaleString(),
            e.base64Image || ''
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['รายการ', 'รายละเอียด', 'จำนวนเงิน (บาท)', 'รูปภาพ']],
            body: expenseRows,
            margin: { left: 14 },
            theme: 'grid',
            styles: { fontSize: 8, font: 'Prompt', minCellHeight: 22, valign: 'middle', cellPadding: 2 },
            headStyles: { fillColor: [230, 126, 34], font: 'Prompt', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 80 },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 25 }
            },
            didParseCell: (data) => {
                if (data.column.index === 3 && data.section === 'body') {
                    data.cell.customImages = data.cell.raw;
                    data.cell.text = [];
                }
            },
            didDrawCell: (data) => {
                if (data.column.index === 3 && data.section === 'body' && data.cell.customImages) {
                    try {
                        const cellWidth = data.cell.width;
                        const cellHeight = data.cell.height;
                        const imgWidth = 20;
                        const imgHeight = 15;
                        const x = data.cell.x + (cellWidth - imgWidth) / 2;
                        const y = data.cell.y + (cellHeight - imgHeight) / 2;
                        doc.addImage(data.cell.customImages, 'JPEG', x, y, imgWidth, imgHeight);
                    } catch (e) { }
                }
            }
          });

          yPos = doc.lastAutoTable.finalY + 15;
        } else {
            yPos += 5;
        }
        
        // Separator
        doc.setDrawColor(200);
        doc.line(14, yPos - 5, 196, yPos - 5);
      });

      doc.save(`report_${reportStartDate}_${reportEndDate}.pdf`);
      showNotification('✅ ดาวน์โหลด PDF เรียบร้อย');

    } catch (error) {
      console.error(error);
      showNotification('❌ สร้าง PDF ไม่สำเร็จ');
    } finally {
      setIsExporting(false);
    }
  };

  const SummaryScreen = () => {
    if (isLoadingSummary || isLoadingDetails) {
      return <div className="text-center py-10 text-slate-500">กำลังโหลดข้อมูล...</div>;
    }

    // Detail View
    if (selectedLogDetails) {
      const { mileage: m, checkIns: c, expenses: e } = selectedLogDetails;
      
      return (
        <div className="space-y-4 pb-20">
          <button 
            onClick={() => setSelectedLogDetails(null)}
            className="flex items-center text-slate-500 hover:text-blue-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าภาพรวม
          </button>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-2">สรุปการเดินทาง</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">เริ่มงาน</span>
                <span className="font-mono font-medium">{formatTime(m.startTime)} ({m.start})</span>
                {m.startImage && (
                  <img 
                    src={m.startImage} 
                    alt="Start Mileage" 
                    className="w-16 h-16 mt-2 rounded object-cover border border-slate-200 cursor-pointer"
                    onClick={() => {
                      const w = window.open("");
                      w.document.write(`<img src="${m.startImage}" style="max-width:100%; height:auto;">`);
                    }}
                  />
                )}
              </div>
              <div>
                <span className="text-slate-500 block">เลิกงาน</span>
                <span className="font-mono font-medium">{m.endTime ? formatTime(m.endTime) : '-'} ({m.end || '-'})</span>
                {m.endImage && (
                  <img 
                    src={m.endImage} 
                    alt="End Mileage" 
                    className="w-16 h-16 mt-2 rounded object-cover border border-slate-200 cursor-pointer"
                    onClick={() => {
                      const w = window.open("");
                      w.document.write(`<img src="${m.endImage}" style="max-width:100%; height:auto;">`);
                    }}
                  />
                )}
              </div>
              <div className="col-span-2 border-t border-slate-50 pt-2 mt-2 flex justify-between items-center">
                <span className="text-slate-500">ระยะทางรวม</span>
                <span className="font-bold text-blue-600 text-lg">{m.distance} กม.</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-500" />
                การเช็คอิน ({c.length})
              </h3>
              {c.some(check => check.latitude && check.longitude) && (
                <button
                  onClick={() => {
                    // Sort chronological: Oldest first (API returns DESC, so reverse)
                    const points = [...c]
                      .filter(ch => ch.latitude && ch.longitude)
                      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                    if (points.length === 0) return;

                    if (points.length === 1) {
                      window.open(`https://www.google.com/maps/search/?api=1&query=${points[0].latitude},${points[0].longitude}`, '_blank');
                      return;
                    }

                    const origin = points[0];
                    const destination = points[points.length - 1];
                    const waypoints = points.slice(1, points.length - 1);

                    let url = `https://www.google.com/maps/dir/?api=1`;
                    url += `&origin=${origin.latitude},${origin.longitude}`;
                    url += `&destination=${destination.latitude},${destination.longitude}`;

                    if (waypoints.length > 0) {
                      const wpStr = waypoints.map(p => `${p.latitude},${p.longitude}`).join('|');
                      url += `&waypoints=${wpStr}`;
                    }

                    window.open(url, '_blank');
                  }}
                  className="text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center hover:bg-blue-100 active:scale-95 transition-transform"
                >
                  <Map className="w-3 h-3 mr-1" />
                  แผนที่เส้นทาง
                </button>
              )}
            </div>
            <div className="space-y-3">
              {c.map((check) => (
                <div key={check.id} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <div className="font-medium text-slate-800">{check.customer}</div>
                  <div className="text-xs text-slate-500 mt-1">{formatTime(check.timestamp)} • {check.note || '-'}</div>
                  {check.images && check.images.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {check.images.map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img} 
                          className="w-12 h-12 rounded object-cover border border-slate-100 cursor-pointer"
                          onClick={() => {
                            const w = window.open("");
                            w.document.write(`<img src="${img}" style="max-width:100%; height:auto;">`);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {c.length === 0 && <div className="text-center text-slate-400 text-sm">ไม่มีการเช็คอิน</div>}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <span className="w-5 h-5 mr-2 flex items-center justify-center font-bold text-orange-500 border border-orange-500 rounded-full text-xs">฿</span>
                ค่าใช้จ่าย ({e.length})
              </h3>
              <button 
                onClick={() => {
                  setModalDailyLogId(m.dailyLogId);
                  setExpenseModalForm({ type: 'Fuel', amount: '', liters: '', image: null });
                  setEditingExpenseId(null);
                  setShowExpenseModal(true);
                }}
                className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center hover:bg-orange-600 active:scale-95 transition-transform"
              >
                <Plus className="w-3 h-3 mr-1" />
                เพิ่ม
              </button>
            </div>
            <div className="space-y-3">
              {e.map((ex) => {
                const imageUrl = ex.image || ex.receipt_image_url;
                console.log('🖼️ Expense Image URL:', imageUrl, 'from expense:', ex);
                return (
                  <div key={ex.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center flex-1">
                        <div className={`p-2 rounded-full mr-3 ${ex.type === 'Fuel' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          {ex.type === 'Fuel' ? <Fuel className="w-4 h-4" /> : <span className="w-4 h-4 flex items-center justify-center font-bold text-sm">฿</span>}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">
                            {ex.type === 'Fuel' ? 'ค่าน้ำมัน' : 'ค่าทางด่วน'}
                          </div>
                          <div className="text-xs text-slate-400">{formatTime(ex.timestamp)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{parseFloat(ex.amount).toLocaleString()} ฿</span>
                        <button 
                          onClick={() => {
                            setModalDailyLogId(m.dailyLogId);
                            setEditingExpenseId(ex.id);
                            setExpenseModalForm({
                              type: ex.type,
                              amount: ex.amount.toString(),
                              liters: ex.liters ? ex.liters.toString() : '',
                              image: imageUrl
                            });
                            setShowExpenseModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-600 p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteExpense(ex.id, m.dailyLogId)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Details: Liters & Image */}
                    <div className="pl-12 space-y-2">
                      {ex.liters && (
                        <div className="text-sm text-slate-600 bg-slate-50 inline-block px-2 py-1 rounded">
                          ⛽ {ex.liters} ลิตร
                        </div>
                      )}
                      {imageUrl && (
                        <div className="flex gap-2 mt-2 overflow-x-auto">
                          <img 
                            key={ex.id}
                            src={imageUrl} 
                            alt="Receipt" 
                            className="w-12 h-12 rounded object-cover border border-slate-100 cursor-pointer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              console.log('❌ Failed to load image:', imageUrl);
                            }}
                            onClick={() => {
                              const w = window.open("");
                              w.document.write(`<img src="${imageUrl}" style="max-width:100%; height:auto;">`);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {e.length === 0 && <div className="text-center text-slate-400 text-sm">ไม่มีค่าใช้จ่าย</div>}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-20">
        <h2 className="text-xl font-bold text-slate-800">ประวัติการทำงาน</h2>
        
        {/* Export Section */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">ส่งออกรายงาน (PDF)</h3>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">เริ่มต้น</label>
                    <input 
                        type="date" 
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">สิ้นสุด</label>
                    <input 
                        type="date" 
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                </div>
            </div>
            <button 
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center hover:bg-slate-900 disabled:opacity-50"
            >
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                ดาวน์โหลด PDF
            </button>
        </div>

        {summaryData.length === 0 ? (
          <div className="text-center py-10 text-slate-400">ไม่พบประวัติการทำงาน</div>
        ) : (
          <div className="space-y-3">
            {summaryData.map((log) => (
              <div 
                key={log.id} 
                onClick={() => fetchLogDetails(log.id)}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-center mb-2 border-b border-slate-50 pb-2">
                  <div className="font-bold text-slate-700">
                    {new Date(log.work_date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${log.status === 'finished' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {log.status === 'finished' ? 'จบงานแล้ว' : 'กำลังทำงาน'}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-slate-400">ระยะทาง</div>
                    <div className="font-bold text-slate-800">
                      {log.end_mileage ? (log.end_mileage - log.start_mileage) : 0} กม.
                    </div>
                  </div>
                  <div className="border-l border-slate-100">
                    <div className="text-xs text-slate-400">ลูกค้า</div>
                    <div className="font-bold text-slate-800">{log.check_in_count} ราย</div>
                  </div>
                  <div className="border-l border-slate-100">
                    <div className="text-xs text-slate-400">ค่าใช้จ่าย</div>
                    <div className="font-bold text-slate-800">{parseFloat(log.total_expenses).toLocaleString()} ฿</div>
                  </div>
                </div>
                <div className="mt-2 text-center text-xs text-blue-500 font-medium">
                    แตะเพื่อดูรายละเอียด
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <>
        <LoginScreen />
        {notification && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm z-50 animate-bounce">
            {notification}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-lg font-extrabold text-gray-500 tracking-tight flex items-center">
          <img src="/logo/YONG.png" alt="Logo" className="h-8 w-auto mr-2" />
          YONGCON<span className="text-blue-600 ml-1 font-medium">Sales</span><span className="text-blue-600 font-bold">CRM</span>
        </h1>
        <div className="flex items-center space-x-3">
          <div className="text-xs font-medium text-slate-500 text-right">
            <div>{user.usersname || user.username}</div>
            <div className="text-[10px] text-slate-400">Online</div>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500">
            <StopCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 overflow-y-auto h-[calc(100vh-140px)]">
        {activeTab === 'dashboard' && Dashboard()}
        {activeTab === 'mileage' && MileageScreen()}
        {activeTab === 'checkin' && CheckInScreen()}
        {activeTab === 'expenses' && ExpenseScreen()}
        {activeTab === 'summary' && SummaryScreen()}
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm z-50 animate-bounce">
          {notification}
        </div>
      )}

      {/* Hidden File Input for OCR */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment"
        onChange={handleOCR} 
      />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="relative flex-1 bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Focus Frame Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* Dark overlay outside the box */}
              <div className="absolute inset-0 bg-black/40 mask-image-none"></div>
              
              {/* Focus Box */}
              <div className="w-80 h-28 border-2 border-yellow-400 rounded-xl relative z-10 shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)] flex items-center justify-center">
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-yellow-400 -mt-0.5 -ml-0.5 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-yellow-400 -mt-0.5 -mr-0.5 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-yellow-400 -mb-0.5 -ml-0.5 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-yellow-400 -mb-0.5 -mr-0.5 rounded-br-lg"></div>
                
                {/* Center Crosshair */}
                <div className="w-4 h-4 border border-yellow-400/50 rounded-full"></div>
                <div className="absolute w-full h-[1px] bg-yellow-400/30"></div>
                <div className="absolute h-full w-[1px] bg-yellow-400/30"></div>

                <div className="absolute -top-12 left-0 right-0 text-center">
                  <span className="bg-black/60 text-white text-sm px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    วางเลขไมล์ในกรอบสีเหลือง
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-50"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Bottom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 pb-10 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center z-40 space-y-6">
              
              {/* Zoom Control */}
              {maxZoom > 1 && (
                <div className="w-64 pointer-events-auto">
                  <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center space-x-3 border border-white/10">
                    <span className="text-white text-xs font-medium">1x</span>
                    <input
                      type="range"
                      min="1"
                      max={maxZoom}
                      step="0.1"
                      value={zoom}
                      onChange={handleZoomChange}
                      className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    />
                    <span className="text-white text-xs font-medium">{maxZoom}x</span>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-yellow-400 text-[10px] font-bold tracking-wider">{zoom.toFixed(1)}x</span>
                  </div>
                </div>
              )}

              {/* Capture Button */}
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center active:scale-95 transition-transform shadow-lg hover:border-yellow-400"
              >
                <div className="w-16 h-16 bg-white rounded-full border-2 border-black"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editingExpenseId ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}</h3>
              <button 
                onClick={() => {
                  setShowExpenseModal(false);
                  setExpenseModalForm({ type: 'Fuel', amount: '', liters: '', image: null });
                  setEditingExpenseId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseFromModal} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {['Fuel', 'Toll'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setExpenseModalForm({...expenseModalForm, type})}
                    className={`p-3 rounded-lg text-sm font-medium border ${expenseModalForm.type === type ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    {type === 'Fuel' ? 'ค่าน้ำมัน' : 'ทางด่วน'}
                  </button>
                ))}
              </div>

              {expenseModalForm.type === 'Fuel' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">จำนวนลิตร</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={expenseModalForm.liters}
                      onChange={(e) => setExpenseModalForm({...expenseModalForm, liters: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                      placeholder="0.00"
                      step="0.01"
                    />
                    <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-bold">L</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">จำนวนเงิน (บาท)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={expenseModalForm.amount}
                    onChange={(e) => setExpenseModalForm({...expenseModalForm, amount: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                    placeholder="0.00"
                    required
                  />
                  <span className="absolute left-3 top-3.5 text-slate-400 text-lg font-bold">฿</span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">รูปใบเสร็จ</label>
                {expenseModalForm.image ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48">
                      <img src={expenseModalForm.image} alt="Receipt" className="w-full h-full object-contain rounded-lg border border-slate-200 bg-slate-50" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpenseModalForm(prev => ({ ...prev, image: null }));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 z-10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <label className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 text-sm font-medium flex items-center justify-center">
                      <Camera className="w-4 h-4 mr-2" />
                      เปลี่ยนรูป
                      <input type="file" accept="image/*" className="hidden" onChange={handleExpenseModalImage} />
                    </label>
                  </div>
                ) : (
                  <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400">
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm">ถ่ายรูปใบเสร็จ</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleExpenseModalImage} />
                  </label>
                )}
              </div>

              <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold shadow-md hover:bg-orange-600 active:scale-95 transition-transform flex justify-center items-center">
                {editingExpenseId ? <Save className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {editingExpenseId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 flex justify-around items-center py-2 pb-5 z-20">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">ภาพรวม</span>
        </button>
        <button 
          onClick={() => setActiveTab('mileage')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'mileage' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Navigation className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">ไมล์</span>
        </button>
        
        {/* Main Action Button (Check-in) */}
        <button 
          onClick={() => setActiveTab('checkin')}
          className="relative -top-6 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          <MapPin className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'expenses' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="text-xl font-bold mb-1 leading-none">฿</span>
          <span className="text-[10px] font-medium">ค่าใช้จ่าย</span>
        </button>
        <button 
          onClick={() => setActiveTab('summary')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'summary' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <FileText className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">สรุป</span>
        </button>
      </div>
    </div>
  );
};

export default SalesCRM;
