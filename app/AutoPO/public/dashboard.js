(async function() {
  try {
    // ดึงข้อมูล PO
    await loadDashboardData();
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
})();

async function loadDashboardData() {
  try {
    // ดึงข้อมูล PO ทั้งหมด
    const poRes = await fetch('api/po');
    const poData = await poRes.json();
    
    if (!poData.ok || !Array.isArray(poData.data)) {
      console.error('Invalid PO data');
      return;
    }

    // ดึงข้อมูลรอบวิ่งที่เสร็จแล้ว
    const finishRes = await fetch('api/finished_po');
    const finishData = await finishRes.json();
    const finishedRuns = finishData.ok && Array.isArray(finishData.data)
      ? finishData.data
      : [];
    
    // ดึงข้อมูลรอบที่รอวิ่ง (status = 2)
    const pendingRes = await fetch('api/pending_po');
    const pendingData = await pendingRes.json();
    const pendingRuns = pendingData.ok && Array.isArray(pendingData.data)
      ? pendingData.data
      : [];
    
    const allPOs = poData.data;
    
    // นับ PO เฉพาะหินและทราย
    let stonePOCount = 0;
    let sandPOCount = 0;
    
    allPOs.forEach(po => {
      const itemName = (po.item_name || '').toLowerCase();
      if (itemName.includes('หิน') || itemName.includes('stone')) {
        stonePOCount++;
      } else if (itemName.includes('ทราย') || itemName.includes('sand')) {
        sandPOCount++;
      }
    });
    
    const totalPO = stonePOCount + sandPOCount; // PO ทั้งหมด = หิน + ทราย
    const inProgressPO = pendingRuns.length; // จำนวนรอบที่รอวิ่ง
    
    // นับรอบวิ่งที่เสร็จแล้ว แยกตามประเภท (ใช้ item_name จาก dispatch_po_runs โดยตรง)
    let totalFinished = finishedRuns.length; // นับทั้งหมด
    let stoneFinished = 0;
    let sandFinished = 0;
    let otherFinished = 0; // สินค้าอื่นๆ (ที่ไม่ใช่หินหรือทราย)

    finishedRuns.forEach(run => {
      const itemName = (run.item_name || '').toLowerCase();
      
      if (itemName.includes('หิน') || itemName.includes('stone')) {
        stoneFinished++;
      } else if (itemName.includes('ทราย') || itemName.includes('sand')) {
        sandFinished++;
      } else {
        otherFinished++;
      }
    });

    const successRate = totalPO > 0 ? ((totalFinished / totalPO) * 100).toFixed(1) : 0;

    // คำนวณ rate ของหินและทราย
    const stoneRate = stonePOCount > 0 ? ((stoneFinished / stonePOCount) * 100).toFixed(1) : 0;
    const sandRate = sandPOCount > 0 ? ((sandFinished / sandPOCount) * 100).toFixed(1) : 0;

    // อัปเดต UI
    document.getElementById('totalPO').textContent = totalPO; // หิน + ทราย
    document.getElementById('successPO').textContent = totalFinished; // รอบวิ่งที่เสร็จทั้งหมด
    document.getElementById('inProgressPO').textContent = inProgressPO;
    document.getElementById('successRate').textContent = successRate + '%';

    document.getElementById('stoneTotalPO').textContent = stonePOCount; // PO หินทั้งหมด
    document.getElementById('stoneSuccessPO').textContent = stoneFinished;
    document.getElementById('stoneRate').textContent = stoneRate + '%';

    document.getElementById('sandTotalPO').textContent = sandPOCount; // PO ทรายทั้งหมด
    document.getElementById('sandSuccessPO').textContent = sandFinished;
    document.getElementById('sandRate').textContent = sandRate + '%';

    // นับจำนวนเที่ยวต่อรถ
    const vehicleStats = new Map();
    finishedRuns.forEach(run => {
      const vehicle = run.vehicle_name || 'ไม่ระบุ';
      vehicleStats.set(vehicle, (vehicleStats.get(vehicle) || 0) + 1);
    });

    // เรียงลำดับตามจำนวนเที่ยวมากไปน้อย
    const sortedVehicles = Array.from(vehicleStats.entries())
      .sort((a, b) => b[1] - a[1]);

    // แสดงในตาราง
    const tbody = document.getElementById('vehicleTableBody');
    if (sortedVehicles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ไม่มีข้อมูล</td></tr>';
    } else {
      tbody.innerHTML = sortedVehicles.map((item, index) => {
        const [vehicle, count] = item;
        const percentage = totalFinished > 0 ? ((count / totalFinished) * 100).toFixed(1) : 0;
        return `
          <tr>
            <td class="text-center text-muted">${index + 1}</td>
            <td>${vehicle}</td>
            <td class="text-center"><span>${count}</span></td>
            <td class="text-center">${percentage}%</td>
          </tr>
        `;
      }).join('');
    }
    
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}
