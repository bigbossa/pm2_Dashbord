const SESSION_ENDPOINT = "/autopo/api/ses";

let DRIVER_ID = new URL(location.href).searchParams.get("driverId");
if (typeof DRIVER_ID === "string") {
  const s = DRIVER_ID.trim().toLowerCase();
  if (s === "" || s === "null" || s === "undefined") DRIVER_ID = null;
}

async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.ok === false)
    throw new Error(j?.detail || `HTTP_${r.status}`);
  return j;
}

async function fetchSession() {
  const j = await fetchJSON(SESSION_ENDPOINT, { credentials: "include" });
  return j.user || {};
}

/* ================= Error Handling (��ͧ�����͹ IIFE) ================= */
const ERROR_TEXT = {
  NETWORK: "�������ö������������������� ��س��ͧ�����ա����",
  TIMEOUT: "������������������ ��س��ͧ����",
  UPLOAD_FAIL: "�ѻ��Ŵ�����������",
  OCR_FAIL: "�������ö��ҹ�����Ũҡ�Ҿ��",
  SAVE_FAIL: "�ѹ�֡��������",
  NOT_FOUND: "��辺�����ŷ���ͧ���",
  PERMISSION: "�س������Է������¡�ù��",
  PARSE: "�������ö��ҹ�����ŵͺ��Ѻ�ҡ���������",
};

function mapErrorMessage(err) {
  if (!err) return "�Դ��ͼԴ��Ҵ�������Һ���˵�";
  if (typeof err === "string") return ERROR_TEXT[err] || err;
  if (err.code && ERROR_TEXT[err.code]) return ERROR_TEXT[err.code];
  if (err.detail) return err.detail;
  if (err.message && ERROR_TEXT[err.message]) return ERROR_TEXT[err.message];
  if (err.message) return err.message;
  return "�Դ��ͼԴ��Ҵ�������Һ���˵�";
}

function showError(err) {
  const msg = mapErrorMessage(err);

  Swal.fire({
    icon: "error",
    title: "�Դ��ͼԴ��Ҵ",
    text: msg,
    confirmButtonText: "��ŧ",
    confirmButtonColor: "#dc3545",
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });

  console.groupCollapsed("[FINISH_PAGE_ERROR]");
  console.error(err);
  console.groupEnd();
}

function disableForm() {
  document
    .getElementById("finishForm")
    .querySelectorAll("input,button")
    .forEach((el) => (el.disabled = true));
}

(function () {
  const qs = new URLSearchParams(location.search);
  const titleRec = document.getElementById("titleRec");
  const mileStartReq = document.getElementById("mileStartReq");
  const previewBox = document.getElementById("previewBox");

  // ��͹ rec_id ����ʴ�� title
  titleRec.textContent = "";
  document.getElementById("backBtn").href = document.referrer || "/";

  // ? �Ѵ��� rec_id ��ҹ sessionStorage
  let rec_id = qs.get("rec_id");
  
  if (rec_id) {
    // �� rec_id �ҡ URL  ��� sessionStorage
    sessionStorage.setItem("current_rec_id", rec_id);
    // ��͹ rec_id �ҡ URL bar ���ͤ�����ʹ���
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "���ҹ", window.location.pathname);
    }
  } else {
    // ����� rec_id �ҡ URL  �ͧ�Ҩҡ sessionStorage
    rec_id = sessionStorage.getItem("current_rec_id");
  }

  if (!rec_id) {
    showError("��辺 rec_id ��س���Ҽ�ҹ˹�ҧҹ���Ѻ");
    disableForm();
    setTimeout(() => {
      window.location.href = "driver_job";
    }, 2000);
    return;
  }

  /* ================= Progressive Form Display ================= */
  function updateFormSections() {
    const mile_start = document.getElementById("mile_start").value.trim();
    const wt_before = document.getElementById("wt_before_pick").value.trim();
    const wt_after = document.getElementById("wt_after_pick").value.trim();
    const wt_arrive = document.getElementById("wt_arrive_dest").value.trim();
    const wt_leave = document.getElementById("wt_leave_dest").value.trim();

    // ��Ǩ�ͺ��� Card 1 (���������) �բ��������������ѧ - ��ͧ�բ����Ũҡ DB
    const hasMileStartSaved = mile_start !== "" && dataFromDB.mile_start;
    const section_mile_start = document.getElementById("section_mile_start");

    // ��Ǩ�ͺ��� Card 2 (���˹ѡ�鹷ҧ) �բ��������������ѧ - ��ͧ�բ����Ũҡ DB
    const hasWtOriginData = wt_before !== "" || wt_after !== "";
    const hasWtOriginSaved = wt_before !== "" && dataFromDB.wt_before_pick;
    const section_wt_origin = document.getElementById("section_wt_origin");

    // ��Ǩ�ͺ��� Card 3 (���˹ѡ���·ҧ) �բ��������������ѧ - ��ͧ�բ����Ũҡ DB (��ͧ�շ�� 2 ���)
    const hasWtDestData = wt_arrive !== "" && wt_leave !== "";
    const hasWtDestSaved = wt_arrive !== "" && dataFromDB.wt_arrive_dest;
    const section_wt_dest = document.getElementById("section_wt_dest");
    const mile_end_value = document.getElementById("mile_end").value.trim();

    // ? �ʴ����� 2 ੾������ͺѹ�֡���� 1 ��������� (��Ǩ�ͺ�ҡ DB)
    if (dataFromDB.mile_start) {
      section_wt_origin.style.display = "block";
    } else {
      section_wt_origin.style.display = "none";
    }

    // ? �ʴ����� 3 ੾������ͺѹ�֡���� 2 ��������� (��Ǩ�ͺ�ҡ DB)
    if (dataFromDB.wt_before_pick) {
      section_wt_dest.style.display = "block";
    } else {
      section_wt_dest.style.display = "none";
    }

    // ? �ʴ����� 4 ੾������ͺѹ�֡���� 3 ��������� (��Ǩ�ͺ�ҡ DB)
    if (dataFromDB.wt_arrive_dest) {
      document.getElementById("section_mile_end").style.display = "block";
    } else {
      document.getElementById("section_mile_end").style.display = "none";
    }

    // === ��áС�ë�͹ Card (���§�ҡ��ѧ�˹��) ===
    
    const section_mile_end = document.getElementById("section_mile_end");
    
    // Debug: �ʴ�ʶҹ�
    console.log("? Card Hide Status:", {
      hasMileStartSaved,
      mile_start,
      imgPaths_mile_start: imgPaths.img_mile_start,
      hasWtOriginSaved,
      hasWtOriginData,
      hasWtDestSaved,
      hasWtDestData
    });
    
    // ��͹ Card 3 ����ͺѹ�֡��������� Card 4 �����ѧ�ӧҹ
    if (hasWtDestSaved && hasWtDestData) {
      console.log("? Hiding Card 3");
      section_wt_dest.style.display = "none";
    }

    // ��͹ Card 2 ����ͺѹ�֡��������� Card 3 �����ѧ�ӧҹ
    if (hasWtOriginSaved && hasWtOriginData) {
      console.log("? Hiding Card 2");
      section_wt_origin.style.display = "none";
    }
    
    // ��͹ Card 1 ����ͺѹ�֡���� (����������ٻ)
    if (hasMileStartSaved) {
      console.log("? Hiding Card 1 - mile_start:", mile_start, "img:", imgPaths.img_mile_start);
      section_mile_start.style.display = "none";
    } else {
      console.log("?? Card 1 NOT hidden - hasMileStartSaved:", hasMileStartSaved);
    }

    // �ʴ������ѹ�֡�����������������Ţ��������ٻ�Ҿ
    const hasMileStart = mile_start !== "";
    const hasMileStartImage = imgPaths.img_mile_start !== null;
    const btnSaveMileStartContainer = document.getElementById(
      "btn_save_mile_start_container"
    );

    if (hasMileStart && hasMileStartImage && btnSaveMileStartContainer) {
      btnSaveMileStartContainer.style.display = "block";
    } else if (btnSaveMileStartContainer) {
      btnSaveMileStartContainer.style.display = "none";
    }

    // �ʴ������ѹ�֡���˹ѡ�鹷ҧ������բ����Ťú
    const hasWtOriginImage = (imgPaths.img_wt_origin || []).length > 0;
    const btnSaveWtOriginContainer = document.getElementById(
      "btn_save_wt_origin_container"
    );

    if (hasWtOriginData && hasWtOriginImage && btnSaveWtOriginContainer) {
      btnSaveWtOriginContainer.style.display = "block";
    } else if (btnSaveWtOriginContainer) {
      btnSaveWtOriginContainer.style.display = "none";
    }

    // �ʴ������ѹ�֡���˹ѡ���·ҧ������բ����Ťú (�ٻ���ѧ�Ѻ)
    const hasWtDestImage = (imgPaths.img_wt_dest || []).length > 0;
    const btnSaveWtDestContainer = document.getElementById(
      "btn_save_wt_dest_container"
    );

    // �ʴ������ѹ�֡����͡�͡���˹ѡ (�����繵�ͧ���ٻ)
    if (hasWtDestData && btnSaveWtDestContainer) {
      btnSaveWtDestContainer.style.display = "block";
    } else if (btnSaveWtDestContainer) {
      btnSaveWtDestContainer.style.display = "none";
    }

    // �ʴ������ѹ�֡��������ش��������Ţ��������ٻ�Ҿ
    const mile_end = document.getElementById("mile_end").value.trim();
    const hasMileEnd = mile_end !== "";
    const hasMileEndImage = imgPaths.img_mile_end !== null;
    const btnSaveMileEndContainer = document.getElementById(
      "btn_save_mile_end_container"
    );

    if (hasMileEnd && hasMileEndImage && btnSaveMileEndContainer) {
      btnSaveMileEndContainer.style.display = "block";
    } else if (btnSaveMileEndContainer) {
      btnSaveMileEndContainer.style.display = "none";
    }

    // �ʴ�����¡��ԡ�ҹ (������ٻ����) ����ͺѹ�֡������������� ����ѧ�����ѹ�֡���˹ѡ�鹷ҧ
    const btnCancelWithMileContainer = document.getElementById("btn_cancel_with_mile_container");
    if (btnCancelWithMileContainer) {
      if (hasMileStartSaved && !hasWtOriginSaved) {
        console.log("? Showing cancel button with mile");
        btnCancelWithMileContainer.style.display = "block";
      } else {
        console.log("?? Hiding cancel button - hasMileStartSaved:", hasMileStartSaved, "hasWtOriginSaved:", hasWtOriginSaved);
        btnCancelWithMileContainer.style.display = "none";
      }
    }
  }

  // ���¡��ء���駷���ա������¹�ŧ input
  [
    "mile_start",
    "wt_before_pick",
    "wt_after_pick",
    "wt_arrive_dest",
    "wt_leave_dest",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateFormSections);
      el.addEventListener("change", updateFormSections);
    }
  });

  /* ================= Helpers: fetch JSON ================= */
  async function fetchJSONLocal(url, opts = {}, { timeoutMs = 20000 } = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...opts,
        signal: controller.signal,
      });
      
      // ��Ǩ�ͺ Content-Type ��͹���� parse JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // �������� JSON �Ҩ�� HTML error page ���� redirect
        if (res.status === 401 || res.status === 403) {
          throw {
            code: "UNAUTHORIZED",
            detail: "Session ������� ��س� Login ����"
          };
        }
        throw {
          code: "INVALID_RESPONSE",
          detail: "����������觢��������١��ͧ (����� JSON)"
        };
      }
      
      const json = await res.json().catch(() => ({
        ok: false,
        code: "PARSE",
        detail: ERROR_TEXT.PARSE,
      }));
      if (!res.ok || json?.ok === false) {
        const err = {
          code: json?.code || `HTTP_${res.status}`,
          detail: json?.detail || res.statusText,
        };
        throw err;
      }
      return json;
    } catch (e) {
      if (e.name === "AbortError")
        throw { code: "TIMEOUT", detail: ERROR_TEXT.TIMEOUT };
      if (e.code || e.detail) throw e;
      throw { code: "NETWORK", detail: ERROR_TEXT.NETWORK };
    } finally {
      clearTimeout(id);
    }
  }
  /* ================= End helpers ================= */

  // ��ʶҹ���Ң������Ҩҡ DB �������
  let dataFromDB = {
    mile_start: false,
    wt_before_pick: false,
    wt_arrive_dest: false,
  };

  // �纾Ҹ�ٻ��ѧ�ѻ��Ŵ
  let imgPaths = {
    img_mile_start: null,
    img_mile_end: null,
    img_wt_origin: [],
    img_wt_dest: [],
    img_cancel_mile: null, // ��������Ѻ�ٻ����¡��ԡ
  };

  /* ================= ��Ŵ����¡��ԡ����ش ================= */
  async function loadLastCancelMile() {
    try {
      const response = await fetch("api/drivers/last-cancel-mile", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) return null;

      const result = await response.json();
      if (result.ok && result.data) {
        return result.data;
      }
      return null;
    } catch (e) {
      console.warn("?? �������ö��Ŵ����¡��ԡ����ش:", e);
      return null;
    }
  }

  // �����������͡ѹ�ѻ��ӵ͹�ѻ��Ŵ
  const lastUploadSig = {
    img_mile_start: null,
    img_mile_end: null,
    img_wt_origin: null,
    img_wt_dest: null,
  };

  function makeSigFromFiles(fileList) {
    if (!fileList || fileList.length === 0) return null;
    const parts = [];
    for (const f of fileList)
      parts.push([f.name, f.size, f.lastModified].join(":"));
    return parts.join("|");
  }

  function renderPreview() {
    const parts = [];

    const pushCard = (
      src,
      label,
      isLocal = false,
      field = null,
      localIndex = null,
      isSaved = false
    ) => {
      const badgeClass = isLocal
        ? "bg-warning"
        : isSaved
        ? "bg-success"
        : "bg-primary";
      const badgeText = isLocal ? "��" : isSaved ? "������" : "�ѻ";

      parts.push(`
      <div class="img-card d-inline-block position-relative me-2 mb-2">
        <img class="img-thumb" src="${src}${
        isLocal ? "" : `?t=${Date.now()}`
      }" style="width: 80px; height: 80px; object-fit: cover;" />
        <div class="small text-muted mt-1">
          ${label}
        </div>
        <span class="badge ${badgeClass} position-absolute top-0 end-0 m-1" style="font-size: 0.7rem;">
          ${badgeText}
        </span>
        ${
          isLocal && field
            ? `<button type="button" class="btn btn-sm btn-outline-danger position-absolute bottom-0 start-0 m-1" 
                     data-remove="1" data-field="${field}" data-idx="${localIndex}" style="font-size: 0.7rem; padding: 2px 6px;">?</button>`
            : ""
        }
      </div>
    `);
    };

    // 1) �ͧ���ѹ�֡���� (imgPaths) - �ʴ����� "������"
    if (imgPaths.img_mile_start)
      pushCard(imgPaths.img_mile_start, "���������", false, null, null, true);
    if (imgPaths.img_mile_end)
      pushCard(imgPaths.img_mile_end, "���쨺", false, null, null, true);
    (imgPaths.img_wt_origin || []).forEach((p, i) =>
      pushCard(p, `�鹷ҧ ${i + 1}`, false, null, null, true)
    );
    (imgPaths.img_wt_dest || []).forEach((p, i) =>
      pushCard(p, `���·ҧ ${i + 1}`, false, null, null, true)
    );

    // 2) �ͧ����ѧ����ѻ (pendingFiles) � �� object URL �ʴ����� "��"
    if (pendingFiles.img_mile_start)
      pushCard(
        URL.createObjectURL(pendingFiles.img_mile_start),
        "���������",
        true,
        "img_mile_start",
        0
      );
    if (pendingFiles.img_mile_end)
      pushCard(
        URL.createObjectURL(pendingFiles.img_mile_end),
        "���쨺",
        true,
        "img_mile_end",
        0
      );
    pendingFiles.img_wt_origin.forEach((f, i) =>
      pushCard(
        URL.createObjectURL(f),
        `�鹷ҧ ${(imgPaths.img_wt_origin || []).length + i + 1}`,
        true,
        "img_wt_origin",
        i
      )
    );
    pendingFiles.img_wt_dest.forEach((f, i) =>
      pushCard(
        URL.createObjectURL(f),
        `���·ҧ ${(imgPaths.img_wt_dest || []).length + i + 1}`,
        true,
        "img_wt_dest",
        i
      )
    );

    if (parts.length === 0) {
      previewBox.innerHTML = `<div class="text-muted small">�ѧ��������</div>`;
    } else {
      // ���� summary
      const savedCount =
        (imgPaths.img_mile_start ? 1 : 0) +
        (imgPaths.img_mile_end ? 1 : 0) +
        (imgPaths.img_wt_origin || []).length +
        (imgPaths.img_wt_dest || []).length;
      const pendingCount =
        (pendingFiles.img_mile_start ? 1 : 0) +
        (pendingFiles.img_mile_end ? 1 : 0) +
        pendingFiles.img_wt_origin.length +
        pendingFiles.img_wt_dest.length;

      const summary = `
              <div class="mb-2 small">
                <span class="badge bg-success me-1">${savedCount} ���������</span>
                <span class="badge bg-warning">${pendingCount} �����</span>
              </div>
            `;

      previewBox.innerHTML = summary + parts.join("");
    }

    // ����ź������ѧ����ѻ
    previewBox.querySelectorAll('button[data-remove="1"]').forEach((btn) => {
      btn.onclick = () => {
        const field = btn.dataset.field;
        const idx = +btn.dataset.idx;

        if (field === "img_mile_start" || field === "img_mile_end") {
          pendingFiles[field] = null;
          // ���������ʴ��������
          clearFilenameDisplay(field);
        } else {
          pendingFiles[field].splice(idx, 1);
          // �ѻവ����ʴ������������Ѻ multiple files
          if (pendingFiles[field].length === 0) {
            clearFilenameDisplay(field);
          }
        }
        renderPreview();
      };
    });
  }

  // �ѻ��Ŵ�ҡ pendingFiles (�����觡Ѻ <input> �µç)
  async function uploadFromInputs() {
    const fd = new FormData();
    const rec_id =
      new URLSearchParams(location.search).get("rec_id") || "unknown";
    fd.append("rec_id", rec_id);

    // ������ҧ���
    const hasPending =
      pendingFiles.img_mile_start ||
      pendingFiles.img_mile_end ||
      pendingFiles.img_wt_origin.length ||
      pendingFiles.img_wt_dest.length;

    if (!hasPending) {
      renderPreview();
      return;
    }

    // ������ŧ������ҡ pendingFiles
    if (pendingFiles.img_mile_start)
      fd.append("img_mile_start", pendingFiles.img_mile_start);
    if (pendingFiles.img_mile_end)
      fd.append("img_mile_end", pendingFiles.img_mile_end);
    pendingFiles.img_wt_origin.forEach((f) => fd.append("img_wt_origin", f));
    pendingFiles.img_wt_dest.forEach((f) => fd.append("img_wt_dest", f));

    try {
      const j = await fetchJSONLocal(
        "api/upload-images",
        { method: "POST", body: fd },
        { timeoutMs: 60000 }
      );

      const p = j.previewPaths || {};
      const uniq = (arr) => [...new Set(arr.filter(Boolean))];

      // �������ѻ��Ŵ��ҡѺ�ͧ��� (single: �Ѻ, multiple: ���)
      imgPaths = {
        img_mile_start:
          p.img_mile_start?.[0] ?? imgPaths.img_mile_start ?? null,
        img_mile_end: p.img_mile_end?.[0] ?? imgPaths.img_mile_end ?? null,
        img_wt_origin: uniq([
          ...(imgPaths.img_wt_origin || []),
          ...(p.img_wt_origin || []),
        ]),
        img_wt_dest: uniq([
          ...(imgPaths.img_wt_dest || []),
          ...(p.img_wt_dest || []),
        ]),
      };

      // ? �ѻ��������� �������� pending
      pendingFiles.img_mile_start = null;
      pendingFiles.img_mile_end = null;
      pendingFiles.img_wt_origin = [];
      pendingFiles.img_wt_dest = [];

      // ���������ʴ��������
      clearFilenameDisplay("img_mile_start");
      clearFilenameDisplay("img_mile_end");
      clearFilenameDisplay("img_wt_origin");
      clearFilenameDisplay("img_wt_dest");

      renderPreview();
    } catch (e) {
      showError(e);
    }
  }

  // ������ѧ����ѻ��Ŵ (����� queue)
  const pendingFiles = {
    img_mile_start: null, // single
    img_mile_end: null, // single
    img_wt_origin: [], // multiple
    img_wt_dest: [], // multiple
  };

  // �ѧ��ѹ�ʴ�������������͡
  function updateFilenameDisplay(inputId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(inputId + "_filename");
    if (!input || !display) return;

    const files = input.files;
    if (!files || files.length === 0) {
      display.innerHTML = "";
      display.className = "form-text small text-muted mt-1";
      return;
    }

    display.className = "form-text small mt-1 filename-display";

    if (files.length === 1) {
      display.innerHTML = `?? <strong>${files[0].name}</strong> (${(
        files[0].size / 1024
      ).toFixed(1)} KB)`;
    } else {
      const fileNames = Array.from(files).map((f) => f.name);
      const totalSize = Array.from(files).reduce((sum, f) => sum + f.size, 0);
      display.innerHTML = `?? <strong>${files.length} ���:</strong> ${fileNames
        .slice(0, 2)
        .join(", ")}${
        files.length > 2 ? ` ����ա ${files.length - 2} ���` : ""
      } (��� ${(totalSize / 1024).toFixed(1)} KB)`;
    }
  }

  // �ѧ��ѹ���������ʴ��������
  function clearFilenameDisplay(inputId) {
    const display = document.getElementById(inputId + "_filename");
    if (display) {
      display.innerHTML = "";
      display.className = "form-text small text-muted mt-1";
    }
  }

  // �ѧ��ѹ�ѻ��Ŵ��� OCR �ѹ��
  async function uploadAndOCR(fieldId, file) {
    try {
      Swal.fire({
        title: "���ѧ�ѻ��Ŵ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const formData = new FormData();
      formData.append(fieldId, file);
      formData.append("rec_id", rec_id);

      // �ѻ��Ŵ
      const uploadResponse = await fetchJSONLocal(
        "api/upload-images",
        { method: "POST", body: formData },
        { timeoutMs: 60000 }
      );

      const p = uploadResponse.previewPaths || {};
      const imagePath = p[fieldId]?.[0];

      if (!imagePath) {
        throw new Error("�ѻ��Ŵ��������");
      }

      // �ѻവ imgPaths
      imgPaths[fieldId] = imagePath;
      renderPreview();

      // ���¡ OCR �ѹ�� - �¡��� type (mile ���� weight)
      const tag = fieldId.replace("img_", "");
      const isWeightTicket = tag.includes("wt"); // 㺪�觹��˹ѡ

      Swal.fire({
        title: isWeightTicket
          ? "?? ���ѧ��ҹ㺪�觹��˹ѡ..."
          : "?? ���ѧ��ҹ�Ţ����...",
        text: "��س����ѡ����",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // ���͡ API endpoint ���������
      const ocrEndpoint = isWeightTicket ? "api/ocr-weight" : "api/ocr";

      // ����Ѻ㺪�� ��ͧ�͡ context (origin/destination)
      let ocrPayload = { rec_id, tag, imagePath };
      if (isWeightTicket) {
        ocrPayload.context = tag === "wt_origin" ? "origin" : "destination";
      }

      const ocrResponse = await fetchJSONLocal(
        ocrEndpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ocrPayload),
        },
        { timeoutMs: 45000 }
      );

      if (ocrResponse && ocrResponse.ok !== false) {
        // �� OCR response �����͹�ѹ�֡
        if (tag === "wt_origin") {
          if (!window.lastOcrResponse) window.lastOcrResponse = {};
          window.lastOcrResponse.wt_origin = ocrResponse;
        } else if (tag === "wt_dest") {
          if (!window.lastOcrResponse) window.lastOcrResponse = {};
          window.lastOcrResponse.wt_dest = ocrResponse;
        }

        applyOcrToFields(ocrResponse, tag);
        ocrDoneSet.add(imagePath);

        // �ѻവ����ʴ��ſ����
        updateFormSections();

        // ? Auto Save ��ѧ OCR �����
        await autoSaveData();

        Swal.fire({
          icon: "success",
          title: "? �ѹ�֡�����",
          // text: "�����Ŷ١�ѹ�֡�ѵ��ѵ�����",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error("OCR ��������");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "�Դ��ͼԴ��Ҵ",
        text: error.message || error.detail || String(error),
      });
      // ? Throw error �͡��������ش��÷ӧҹ���
      throw error;
    }
  }

  // �͹����¹��� ����ѻ��Ŵ��� OCR �ѹ�� (����Ѻ����)
  ["img_mile_start", "img_mile_end", "img_wt_origin", "img_wt_dest", "img_cancel_mile"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`?? Element not found: ${id}`);
        return; // ������������ element
      }

      el.addEventListener("change", async () => {
        const files = el.files ? [...el.files] : [];

        // �ѻവ�ʴ��������
        updateFilenameDisplay(id);

        if (!files.length) return;

        if (id === "img_mile_start" || id === "img_mile_end" || id === "img_cancel_mile") {
          // Single file: �ѻ��Ŵ��� OCR �ѹ��
          if (imgPaths[id] && files[0]) {
            const result = await Swal.fire({
              title: "���Ҿ��������",
              text: `��ͧ���᷹����Ҿ${
                id.includes("start") ? "���������" : "���쨺"
              }�������?`,
              icon: "question",
              showCancelButton: true,
              confirmButtonText: "᷹���",
              cancelButtonText: "¡��ԡ",
            });

            if (result.isConfirmed) {
              await uploadAndOCR(id, files[0]);
            } else {
              el.value = "";
              updateFilenameDisplay(id);
            }
          } else {
            await uploadAndOCR(id, files[0]);
          }
        } else {
          // Multiple files: ����������������ѧ queue �����ź�ͧ���
          pendingFiles[id].push(...files);
          renderPreview();
        }
      });
    }
  );

  // �Ӫ���������� OCR �����
  const ocrDoneSet = new Set();

  // �ѧ��ѹ Auto Save
  async function autoSaveData() {
    const valStr = (id) => {
      const v = document.getElementById(id).value.trim();
      return v === "" ? null : v;
    };

    const valNum = (id) => {
      const v = document.getElementById(id).value.trim();
      // ? �ŧ�繨ӹǹ����¡�ûѴ��� (�ͧ�Ѻ�ȹ���)
      return v === "" ? null : Math.round(Number(v));
    };

    const mile_start = valStr("mile_start");
    const mile_end = valStr("mile_end");
    const wt_before_pick = valNum("wt_before_pick");
    const wt_after_pick = valNum("wt_after_pick");
    const wt_arrive_dest = valNum("wt_arrive_dest");
    const wt_leave_dest = valNum("wt_leave_dest");

    // ��Ǩ�ͺ��Ҫ���ҵ�ͧ���¡��Ҫ��˹ѡ
    if (wt_before_pick != null && wt_after_pick != null) {
      if (wt_before_pick >= wt_after_pick) {
        console.error("? ���˹ѡ����� ��ͧ���¡��� ���˹ѡ���˹ѡ ��Ǩ�ͺ㺪���ա����");
        return false;
      }
    }

    if (wt_arrive_dest != null && wt_leave_dest != null) {
      if (wt_leave_dest >= wt_arrive_dest) {
        console.error("? ���˹ѡ����� ��ͧ���¡��� ���˹ѡ���˹ѡ ��Ǩ�ͺ㺪���ա����");
        return false;
      }
    }

    try {
      let detailPayload = {
        note: document.getElementById("note")?.value || "",
        driver_name: DRIVER_ID?.name || "",
        driver_id: DRIVER_ID?.id || "",
        record_time: new Date().toISOString(),
      };

      if (typeof globalThis !== "undefined" && globalThis.detailPayload) {
        detailPayload = globalThis.detailPayload;
      }

      const payload = {
        rec_id,
        mile_start,
        mile_end,
        wt_before_pick,
        wt_after_pick,
        wt_arrive_dest,
        wt_leave_dest,
        meta: { images: imgPaths },
        detail: JSON.stringify(detailPayload),
      };

      const r = await fetch("api/drivers/job/finish-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || j?.ok === false) {
        throw {
          code: "SAVE_FAIL",
          detail: j?.detail || "�ѹ�֡��������",
        };
      }

      // ? �ѹ�֡����� - �ѻവʶҹ���Ң���������� DB ����
      if (mile_start) dataFromDB.mile_start = true;
      if (wt_before_pick) dataFromDB.wt_before_pick = true;
      if (wt_arrive_dest) dataFromDB.wt_arrive_dest = true;

      console.log("? Auto-saved to DB, dataFromDB status:", dataFromDB);

      // ź��� JSON ��ѧ�ѹ�֡�����
      try {
        await fetch(`api/ocr-cleanup/${rec_id}`, { method: "DELETE" });
      } catch (cleanupErr) {
        console.warn("ź��� JSON �����:", cleanupErr);
      }

      // ��Ҩ��ҹ���� (��͡��������ش) ����Ѻ˹����ѡ
      if (j.done && mile_end) {
        setTimeout(() => {
          location.href = document.referrer || "driver_job";
        }, 2000);
      }

      return true;
    } catch (e) {
      console.error("Auto save error:", e);
      return false;
    }
  }

  // ��Ŵ��������� + ��駡���������������á + �������촷�����������
  (async function loadPrev() {
    try {
      const r = await fetch(
        `api/drivers/job/finish-db/get?rec_id=${encodeURIComponent(rec_id)}`
      );
      const j = await r.json().catch(() => ({}));
      const prev = j?.data || null;

      if (prev?.mile_end != null) {
        await Swal.fire({
          icon: "info",
          title: "�ҹ��騺����",
          timer: 1000,
          showConfirmButton: false,
        });
        disableForm();
        return;
      }

      const firstTime = !prev;
      mileStartReq.textContent = firstTime ? "*" : "";

      const setV = (id, v, ro = false) => {
        const el = document.getElementById(id);
        if (v != null) {
          // �� setMile ����Ѻ���� ��� setNum ����Ѻ����
          if (id.includes("mile")) {
            el.value = String(v); // ���� string ����Ѻ����
          } else {
            el.value = v;
          }
        }
        if (ro) {
          el.readOnly = true;
          el.classList.add("readonly-field");
        }
      };
      // ? ��Ŵ�ٻ�Ҿ���ѹ�֡������� (��ͧ��Ŵ��͹ setV ������� imgPaths �դ��)
      console.log("?? Loading saved data:", prev);
      console.log("?? Saved images:", prev?.saved_images, prev?.meta?.images);
      
      if (prev?.saved_images || prev?.meta?.images) {
        const savedImages = prev.saved_images || prev.meta.images;
        console.log("? Found saved images:", savedImages);
        
        imgPaths = {
          img_mile_start: savedImages.img_mile_start || null,
          img_mile_end: savedImages.img_mile_end || null,
          img_wt_origin: Array.isArray(savedImages.img_wt_origin)
            ? savedImages.img_wt_origin
            : [],
          img_wt_dest: Array.isArray(savedImages.img_wt_dest)
            ? savedImages.img_wt_dest
            : [],
        };

        console.log("?? imgPaths after loading:", imgPaths);

        // �����ٻ�Ҿ���������ŧ� OCR done set
        [savedImages.img_mile_start, savedImages.img_mile_end].forEach(
          (path) => {
            if (path) ocrDoneSet.add(path);
          }
        );
        [
          ...(savedImages.img_wt_origin || []),
          ...(savedImages.img_wt_dest || []),
        ].forEach((path) => {
          if (path) ocrDoneSet.add(path);
        });

        renderPreview();
      } else {
        console.log("?? No saved images found in database");
      }

      setV("mile_start", prev?.mile_start, !!prev?.mile_start);
      setV("mile_end", prev?.mile_end);
      setV("wt_before_pick", prev?.wt_before_pick);
      setV("wt_after_pick", prev?.wt_after_pick);
      setV("wt_arrive_dest", prev?.wt_arrive_dest);
      setV("wt_leave_dest", prev?.wt_leave_dest);

      // ? ����ѧ�������������� �ͧ�֧����¡��ԡ����ش���ʴ�
      if (!prev?.mile_start) {
        const lastCancelData = await loadLastCancelMile();
        if (lastCancelData && lastCancelData.last_cancel_mile_image) {
          // �ʴ���ͤ�������͹
          const mileStartContainer = document.getElementById("section_mile_start");
          if (mileStartContainer) {
            const alertDiv = document.createElement("div");
            alertDiv.className = "alert alert-info mb-3";
            alertDiv.innerHTML = `
              
              ${lastCancelData.mile_cancel ? `�Ţ��������ش: ${lastCancelData.mile_cancel}<br>` : ""}
              <button type="button" class="btn btn-sm btn-success mt-2" id="btn_use_cancel_mile">
                ? ��������
              </button>
            `;
            mileStartContainer.querySelector(".card-body").insertBefore(
              alertDiv,
              mileStartContainer.querySelector(".row")
            );

            // ����������¡��ԡ
            document.getElementById("btn_use_cancel_mile")?.addEventListener("click", async () => {
              // ���ٻ����¡��ԡ���ٻ���������
              imgPaths.img_mile_start = lastCancelData.last_cancel_mile_image;
              
              
              // ��͡�Ţ�����ѵ��ѵ� (�����)
              if (lastCancelData.mile_cancel) {
                document.getElementById("mile_start").value = lastCancelData.mile_cancel;
              }

              // ��͹ alert
              alertDiv.style.display = "none";

              // �ʴ������ѹ�֡
              updateFormSections();

              // ź����������¡��ԡ�ҡ backend �����������ʴ��ա
              try {
                await fetch("api/drivers/clear-last-cancel-mile", {
                  method: "POST",
                  credentials: "include",
                });
              } catch (e) {
                console.warn("?? �������öź����������¡��ԡ:", e);
              }

              Swal.fire({
                icon: "success",
                title: "������¡��ԡ�����",
                text: lastCancelData.mile_cancel ? `�Ţ����: ${lastCancelData.mile_cancel}` : "��سҵ�Ǩ�ͺ���ǡ��ѹ�֡",
                timer: 2000,
                showConfirmButton: false,
              });
            });
          }
        }
      }

      // ��駤��ʶҹ���Ң������Ҩҡ DB
      if (prev?.mile_start != null && prev?.mile_start !== "") {
        dataFromDB.mile_start = true;
      }
      if (prev?.wt_before_pick != null && prev?.wt_before_pick !== "") {
        dataFromDB.wt_before_pick = true;
      }
      if (prev?.wt_arrive_dest != null && prev?.wt_arrive_dest !== "") {
        dataFromDB.wt_arrive_dest = true;
      }

      console.log("? Data from DB status:", dataFromDB);

      // �ѻവ����ʴ��ſ���� (��ѧ�ҡ��Ŵ imgPaths ��� dataFromDB ����)
      updateFormSections();

      // ? Scroll ��ѧ���촷����ѧ�ӧҹ���� (�������촷�����������)
      setTimeout(() => {
        let targetCard = null;
        let cardName = "";
        
        // �礡��촷���ͧ�ʴ�
        if (!dataFromDB.mile_start) {
          targetCard = document.getElementById("section_mile_start");
          cardName = "Card 1: ���������";
        } else if (!dataFromDB.wt_before_pick) {
          targetCard = document.getElementById("section_wt_origin");
          cardName = "Card 2: ���˹ѡ�鹷ҧ";
          // �ѧ�Ѻ�ʴ�����
          targetCard.style.display = "block";
        } else if (!dataFromDB.wt_arrive_dest) {
          targetCard = document.getElementById("section_wt_dest");
          cardName = "Card 3: ���˹ѡ���·ҧ";
          // �ѧ�Ѻ�ʴ�����
          targetCard.style.display = "block";
        } else if (!prev?.mile_end) {
          targetCard = document.getElementById("section_mile_end");
          cardName = "Card 4: ��������ش";
          // �ѧ�Ѻ�ʴ�����
          targetCard.style.display = "block";
        }
        
        // Scroll ��ѧ���촷���ͧ��
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
          console.log("?? Scrolled to:", cardName);
          
          // ���� highlight ���Ǥ������������繪Ѵ��� scroll 价���˹
          targetCard.style.transition = "all 0.3s ease";
          targetCard.style.transform = "scale(1.02)";
          setTimeout(() => {
            targetCard.style.transform = "scale(1)";
          }, 600);
        } else {
          console.log("?? No target card to scroll (all completed or first time)");
        }
      }, 800);
    } catch (e) {
      console.warn("loadPrev fail", e);
    }
  })();

  // helper: �ʴ�����Ţ�¤� 0 ��˹�� (�� text input ����)
  function setMile(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    if (v == null || v === "") return;

    // �ŧ input �� text ��������Ѻ����
    if (el.type !== "text") {
      el.type = "text";
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("pattern", "\\d*");
    }

    // �纤���� string �����ѡ�� leading zeros
    el.value = String(v);
  }

  // helper: �ʴ�����Ţ����Ѻ���˹ѡ (�ѧ�� number input)
  function setNum(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    if (v == null || v === "") return;

    if (typeof v === "string") {
      const s = v.trim();
      // ����Ѻ���˹ѡ �������� leading zero ����� number input
      if (/^\d+(\.\d+)?$/.test(s)) v = Number(s);
      else {
        el.value = s;
        return;
      }
    }

    if (typeof v === "number" && Number.isFinite(v)) {
      let out = v;
      const minAttr = el.getAttribute("min");
      const maxAttr = el.getAttribute("max");
      if (minAttr != null && !Number.isNaN(+minAttr))
        out = Math.max(out, +minAttr);
      if (maxAttr != null && !Number.isNaN(+maxAttr))
        out = Math.min(out, +maxAttr);
      el.value = String(out);
      return;
    }

    el.value = String(v);
  }

  // ��¹���Ẻ "��ͧ�Ҩҡ���觷��١��ͧ��ҹ��"
  function setStrict(tagExpected, tagGot, setFn) {
    // tagGot ��������ҹ�ҡ j.meta.tag ������������� tag ����������
    if (!tagGot || typeof tagGot !== "string") return;
    if (tagGot !== tagExpected) return; // ���ç tag �������
    setFn();
  }

  // ������¹���੾������ͪ�ͧ��� "�ѧ��ҧ"
  function setIfEmpty(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    if (v == null || v === "") return;
    if (String(el.value || "").trim() === "") {
      // �� setMile ����Ѻ���� ��� setNum ����Ѻ����
      if (id.includes("mile")) {
        setMile(id, String(v));
      } else {
        setNum(id, String(v));
      }
    }
  }

  // ========= applyOcrToFields =========
  function applyOcrToFields(j, tag) {
    // ���¡ updateFormSections ��ѧ�ҡ apply �������
    setTimeout(() => updateFormSections(), 100);

    // Debug: �ʴ� OCR response structure
    console.log(
      "?? [applyOcrToFields] Full OCR response:",
      JSON.stringify(j, null, 2)
    );

    // ===== source =====
    const f = j?.fields || {};
    const raw = (j && (j.raw?.data ?? j.data ?? j.raw ?? j)) || {};
    // tag �����Ѵ�Թ� (�ͧ�ѺẺ wt_dest[0])
    const t = String(j?.meta?.tag || tag || "").split("[")[0];

    console.log("?? [applyOcrToFields] Extracted data:", {
      tag: t,
      fields: f,
      raw: raw,
      normalized: j?.normalized,
    });

    // ===== helpers =====
    const toNum = (v) => {
      if (v == null) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const m = v.replace(/[, ]+/g, "").match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : null;
      }
      return null;
    };
    const rows = Array.isArray(raw.entries)
      ? raw.entries
      : Array.isArray(raw.items)
      ? raw.items
      : [];

    const isIn = (s) => {
      s = String(s || "").toLowerCase();
      return s.includes("���") || s === "in" || s.includes("arrive");
    };
    const isOut = (s) => {
      s = String(s || "").toLowerCase();
      return s.includes("�͡") || s === "out" || s.includes("leave");
    };

    const rowOf = (want) => {
      const wantIn = String(want).toLowerCase() === "���";
      for (const r of rows) {
        const cands = [
          r?.type,
          r?.keyword,
          r?.label,
          r?.status,
          r?.direction,
        ].map((x) => String(x ?? "").toLowerCase());
        const hit = cands.some((s) => (wantIn ? isIn(s) : isOut(s)));
        if (hit) return r;
      }
      return null;
    };

    const weightOf = (obj) => {
      if (!obj) return null;
      const cands = [obj.weight, obj.wt, obj.weight_value, obj.value, obj.text];
      for (const v of cands) {
        const n = toNum(v);
        if (n != null) return n;
      }
      // fallback: ���͡�Ţ�ҡ�ش (�ѹⴹ�ѹ���/����) �����
      const nums = Object.values(obj)
        .map(toNum)
        .filter((n) => n != null);
      if (!nums.length) return null;
      const big = nums.filter((x) => x >= 500);
      return big.length ? Math.max(...big) : Math.max(...nums);
    };

    const setStr = (id, v) => {
      if (v != null && v !== "") {
        if (id.includes("mile")) {
          setMile(id, String(v));
        } else {
          setNum(id, String(v));
        }
      }
    };

    // ===== ���� (��¹੾�� tag ���ç) =====
    if (t === "mile_start") {
      const odo =
        raw.odometer ??
        raw.mile_start ??
        raw.start_mile ??
        raw.mileage ??
        raw.trip ??
        null;
      setStr("mile_start", f.mile_start ?? (odo != null ? String(odo) : null));
      return;
    }
    if (t === "mile_end") {
      const odo =
        raw.odometer_end ??
        raw.mile_end ??
        raw.end_mile ??
        raw.odometer ??
        raw.trip ??
        null;
      setStr("mile_end", f.mile_end ?? (odo != null ? String(odo) : null));
      return;
    }
    if (t === "cancel_mile") {
      const odo =
        raw.odometer ??
        raw.cancel_mile ??
        raw.mileage ??
        raw.trip ??
        null;
      setStr("cancel_mile", f.cancel_mile ?? (odo != null ? String(odo) : null));
      return;
    }

    // ===== �鹷ҧ (��¹੾������� tag === 'wt_origin') =====
    if (t === "wt_origin") {
      let before = f.wt_before_pick;
      let after = f.wt_after_pick;
      // �֧�Ţ���ҡ fields (normalized) ��͹ �ҡ��鹨֧�֧�ҡ raw
      let ticketNum =
        f.ticket_number ||
        f.ticketNumber ||
        raw.ticket_number ||
        raw.ticketNumber ||
        raw.�Ţ��� ||
        null;

      const rin = rowOf("���");
      const rout = rowOf("�͡");
      if (before == null && rin) before = weightOf(rin);
      if (after == null && rout) after = weightOf(rout);

      if (before == null)
        before = toNum(
          raw.inWeight ?? raw.in_weight ?? raw.weight_entry ?? raw["�鹷ҧ���"]
        );
      if (after == null)
        after = toNum(
          raw.outWeight ?? raw.out_weight ?? raw.weight_exit ?? raw["�鹷ҧ�͡"]
        );

      if ((before == null || after == null) && rows.length) {
        const nums = [];
        rows.forEach((r) => {
          const n = weightOf(r);
          if (n != null) nums.push(n);
        });
        if (before == null && nums[0] != null) before = nums[0];
        if (after == null && nums[1] != null) after = nums[1];
      }

      // ���������ŧ input fields (visible)
      if (ticketNum) {
        const el = document.getElementById("ticket_number_origin");
        if (el) el.value = ticketNum;
      }
      setStr("wt_before_pick", before);
      setStr("wt_after_pick", after);

      // ���������ŧ hidden fields
      const vehiclePlate =
        j?.normalized?.fields?.vehicle_plate ||
        j?.data?.vehicle_plate ||
        j?.fields?.vehicle_plate ||
        raw.vehicle_plate ||
        raw.����¹ö ||
        null;

      const remark1 =
        j?.normalized?.fields?.remark1 ||
        j?.data?.remark1 ||
        j?.fields?.remark1 ||
        raw.remark1 ||
        raw.�����˵�1 ||
        null;

      const remark2 =
        j?.normalized?.fields?.remark2 ||
        j?.data?.remark2 ||
        j?.fields?.remark2 ||
        raw.remark2 ||
        raw.�����˵�2 ||
        null;

      const remark3 =
        j?.normalized?.fields?.remark3 ||
        j?.data?.remark3 ||
        j?.fields?.remark3 ||
        raw.remark3 ||
        raw.�����˵�3 ||
        null;

      // �纤��ŧ hidden inputs
      const regnoInput = document.getElementById("regno_out");
      const remark1Input = document.getElementById("remark_1");
      const remark2Input = document.getElementById("remark_2");
      const remark3Input = document.getElementById("remark_3");

      if (regnoInput) regnoInput.value = vehiclePlate || "";
      if (remark1Input) remark1Input.value = remark1 || "";
      if (remark2Input) remark2Input.value = remark2 || "";
      if (remark3Input) remark3Input.value = remark3 || "";

      console.log("?? [Hidden fields updated]", {
        regno_out: vehiclePlate,
        remark_1: remark1,
        remark_2: remark2,
        remark_3: remark3,
      });

      return;
    }

    // ===== ���·ҧ (��¹੾������� tag === 'wt_dest') =====
    if (t === "wt_dest") {
      let arrive = f.wt_arrive_dest;
      let leave = f.wt_leave_dest;
      // �֧�Ţ���ҡ fields (normalized) ��͹ �ҡ��鹨֧�֧�ҡ raw
      let ticketNum =
        f.ticket_number ||
        f.ticketNumber ||
        raw.ticket_number ||
        raw.ticketNumber ||
        raw.�Ţ��� ||
        null;

      const rin = rowOf("���");
      const rout = rowOf("�͡");
      if (arrive == null && rin) arrive = weightOf(rin);
      if (leave == null && rout) leave = weightOf(rout);

      if (arrive == null)
        arrive = toNum(
          raw.destIn ??
            raw.arriveIn ??
            raw.dest_in ??
            raw.arrive_in ??
            raw.weight_entry ??
            raw["���·ҧ���"]
        );
      if (leave == null)
        leave = toNum(
          raw.destOut ??
            raw.leaveOut ??
            raw.dest_out ??
            raw.leave_out ??
            raw.weight_exit ??
            raw["���·ҧ�͡"]
        );

      if ((arrive == null || leave == null) && rows.length) {
        const nums = [];
        rows.forEach((r) => {
          const n = weightOf(r);
          if (n != null) nums.push(n);
        });
        if (arrive == null && nums[0] != null) arrive = nums[0];
        if (leave == null && nums[1] != null) leave = nums[1];
      }

      // ���������ŧ input fields (visible)
      if (ticketNum) {
        const el = document.getElementById("ticket_number_dest");
        if (el) el.value = ticketNum;
      }
      setStr("wt_arrive_dest", arrive);
      setStr("wt_leave_dest", leave);

      // ���������ŧ hidden fields
      const vehiclePlate =
        j?.normalized?.fields?.vehicle_plate ||
        j?.data?.vehicle_plate ||
        j?.fields?.vehicle_plate ||
        raw.vehicle_plate ||
        raw.����¹ö ||
        null;

      const remark1 =
        j?.normalized?.fields?.remark1 ||
        j?.data?.remark1 ||
        j?.fields?.remark1 ||
        raw.remark1 ||
        raw.�����˵�1 ||
        null;

      const remark2 =
        j?.normalized?.fields?.remark2 ||
        j?.data?.remark2 ||
        j?.fields?.remark2 ||
        raw.remark2 ||
        raw.�����˵�2 ||
        null;

      const remark3 =
        j?.normalized?.fields?.remark3 ||
        j?.data?.remark3 ||
        j?.fields?.remark3 ||
        raw.remark3 ||
        raw.�����˵�3 ||
        null;

      // �纤��ŧ hidden inputs ����Ѻ���·ҧ (�� fields ���ǡѹ�Ѻ�鹷ҧ)
      const regnoInInput = document.getElementById("regno_in");
      const remark1Input = document.getElementById("remark_1");
      const remark2Input = document.getElementById("remark_2");
      const remark3Input = document.getElementById("remark_3");

      if (regnoInInput) regnoInInput.value = vehiclePlate || "";
      if (remark1Input) remark1Input.value = remark1 || "";
      if (remark2Input) remark2Input.value = remark2 || "";
      if (remark3Input) remark3Input.value = remark3 || "";

      console.log("?? [Hidden fields updated - Destination]", {
        regno_in: vehiclePlate,
        remark_1: remark1,
        remark_2: remark2,
        remark_3: remark3,
      });

      return;
    }

    // ===== �ó�����: �������� ���͡ѹ cross-fill =====
  }

  /* ====== OCR cache Ẻ ��������ԧ � ====== */
  const ocrFileSig = { mile_start: null, mile_end: null };
  const ocrFileCache = { mile_start: null, mile_end: null };
  const originSigMap = new Map(); // key: imagePath
  const originCache = new Map(); // key: imagePath -> response
  const destSigMap = new Map();
  const destCache = new Map();
  const sigOfPath = (p) =>
    typeof p === "string" ? p : Array.isArray(p) ? p.join("|") : null;

  // Validate + Save
  const btnSave = document.getElementById("btnSave");
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const valStr = (id) => {
        const v = document.getElementById(id).value.trim();
        return v === "" ? null : v;
      };

      const valNum = (id) => {
        const v = document.getElementById(id).value.trim();
        return v === "" ? null : Number(v);
      };

      // ������ string, ���˹ѡ�� number
      const mile_start = valStr("mile_start");
      const mile_end = valStr("mile_end");
      const wt_before_pick = valNum("wt_before_pick");
      const wt_after_pick = valNum("wt_after_pick");
      const wt_arrive_dest = valNum("wt_arrive_dest");
      const wt_leave_dest = valNum("wt_leave_dest");

      const firstTime =
        document.getElementById("mileStartReq").textContent === "*";
      if (firstTime && mile_start == null)
        return showError("��سҡ�͡ '���������' ����Ѻ�����á");

      // Validation ����Ѻ���� (string)
      if (mile_start != null) {
        if (!/^\d+$/.test(mile_start)) {
          return showError("�����������ͧ�繵���Ţ��ҹ��");
        }
      }
      if (mile_end != null) {
        if (!/^\d+$/.test(mile_end)) {
          return showError("��������ش��ͧ�繵���Ţ��ҹ��");
        }
      }

      // ���º��º���� (�ŧ�� number �������º��º)
      if (mile_start != null && mile_end != null) {
        const startNum = parseInt(mile_start, 10);
        const endNum = parseInt(mile_end, 10);
        if (endNum <= startNum) {
          return showError("��������ش ��ͧ�ҡ���� ���������");
        }
      }

      // Validation ����Ѻ���˹ѡ
      for (const [label, v] of [
        ["���˹ѡ��͹�Ѻ�ͧ", wt_before_pick],
        ["���˹ѡ��ѧ�Ѻ�ͧ", wt_after_pick],
        ["���˹ѡ�֧���·ҧ", wt_arrive_dest],
        ["���˹ѡ�͡���·ҧ", wt_leave_dest],
      ]) {
        if (v != null && v < 0) return showError(`${label} ��ͧ���Դź`);
      }

      // ��Ǩ�ͺ��Ҫ���ҵ�ͧ���¡��Ҫ��˹ѡ
      if (wt_before_pick != null && wt_after_pick != null) {
        if (wt_before_pick >= wt_after_pick) {
          return showError("���˹ѡ����� ��ͧ���¡��� ���˹ѡ���˹ѡ ��Ǩ�ͺ㺪���ա����");
        }
      }

      if (wt_arrive_dest != null && wt_leave_dest != null) {
        if (wt_leave_dest >= wt_arrive_dest) {
          return showError("���˹ѡ����� ��ͧ���¡��� ���˹ѡ���˹ѡ ��Ǩ�ͺ㺪���ա����");
        }
      }

      try {
        Swal.showLoading();
        let detailPayload = {
          note: document.getElementById("note")?.value || "",
          driver_name: DRIVER_ID?.name || "",
          driver_id: DRIVER_ID?.id || "",
          record_time: new Date().toISOString(),
        };

        if (typeof globalThis !== "undefined" && globalThis.detailPayload) {
          detailPayload = globalThis.detailPayload; // ��ͧ���������
        }

        const payload = {
          rec_id,
          mile_start,
          mile_end,
          wt_before_pick,
          wt_after_pick,
          wt_arrive_dest,
          wt_leave_dest,
          meta: { images: imgPaths },
          detail: JSON.stringify(detailPayload), // <<=== ���� text
        };

        const r = await fetch("api/drivers/job/finish-db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        Swal.hideLoading();

        if (!r.ok || j?.ok === false)
          throw {
            code: "SAVE_FAIL",
            detail: j?.detail || "�ѹ�֡��������",
          };

        // ź��� JSON ��ѧ�ѹ�֡�����
        try {
          await fetch(`api/ocr-cleanup/${rec_id}`, { method: "DELETE" });
        } catch (cleanupErr) {
          console.warn("ź��� JSON �����:", cleanupErr);
        }

        if (j.done) {
          await Swal.fire({
            icon: "success",
            title: "���ҹ�����",
            timer: 1200,
            showConfirmButton: false,
          });
          location.href = document.referrer || "driver_job";
        } else {
          await Swal.fire({
            icon: "success",
            title: "�ѹ�֡����",
            timer: 900,
            showConfirmButton: false,
          });
          location.href = document.referrer || "driver_job";
        }
      } catch (e) {
        Swal.hideLoading();
        showError(e);
        // ? ��� redirect ��� error - �������㹿�������
      }
    });
  } else {
    console.warn("?? btnSave not found (������� - �� auto save)");
  }

  /* ================= Validation Helper ================= */
  function validateRequiredFields(fields) {
    const missing = [];
    
    fields.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      const value = el ? String(el.value || "").trim() : "";
      if (value === "") {
        missing.push(label);
        // Highlight missing field
        if (el) {
          el.style.borderColor = "#f56565";
          el.style.borderWidth = "2px";
        }
      } else {
        // Remove highlight if filled
        if (el) {
          el.style.borderColor = "";
          el.style.borderWidth = "";
        }
      }
    });
    
    return missing;
  }



  /* ================= ����¡��ԡ�ҹẺ���� (������ٻ����) ================= */
  const btnShowCancelForm = document.getElementById("btn_show_cancel_form");
  const btnHideCancelForm = document.getElementById("btn_hide_cancel_form");
  const cancelFormSection = document.getElementById("cancel_form_section");
  const btnConfirmCancel = document.getElementById("btn_confirm_cancel");
  const btnCameraCancelMile = document.getElementById("btn_camera_cancel_mile");
  const imgCancelMileInput = document.getElementById("img_cancel_mile");

  // �ʴ������¡��ԡ
  if (btnShowCancelForm) {
    btnShowCancelForm.addEventListener("click", () => {
      if (cancelFormSection) {
        cancelFormSection.style.display = "block";
        btnShowCancelForm.style.display = "none";
        
        // ��͹੾����ǹ��Ŵ�㺪�� ����͹�����¡��ԡ
        const wtOriginFieldsWrapper = document.getElementById("wt_origin_fields_wrapper");
        if (wtOriginFieldsWrapper) {
          wtOriginFieldsWrapper.style.display = "none";
        }
        
        // ����¹��Ǣ���� "¡��ԡ�ҹ"
        const wtOriginTitleText = document.getElementById("wt_origin_title_text");
        if (wtOriginTitleText) {
          wtOriginTitleText.textContent = "¡��ԡ�ҹ";
        }
      }
    });
  }

  // ��͹�����¡��ԡ
  if (btnHideCancelForm) {
    btnHideCancelForm.addEventListener("click", () => {
      if (cancelFormSection) {
        cancelFormSection.style.display = "none";
        btnShowCancelForm.style.display = "block";
        // Clear form
        document.getElementById("cancel_note").value = "";
        imgPaths.img_cancel_mile = null;
        document.getElementById("img_cancel_mile_filename").textContent = "";
        
        // �ʴ���ǹ��Ŵ�㺪�觡�Ѻ��
        const wtOriginFieldsWrapper = document.getElementById("wt_origin_fields_wrapper");
        if (wtOriginFieldsWrapper) {
          wtOriginFieldsWrapper.style.display = "block";
        }
        
        // ����¹��Ǣ�͡�Ѻ�� "㺪���͡"
        const wtOriginTitleText = document.getElementById("wt_origin_title_text");
        if (wtOriginTitleText) {
          wtOriginTitleText.textContent = "㺪���ç���";
        }
      }
    });
  }

  // Note: btn_camera_cancel_mile is now handled by camera modal system (see fieldMap below)

  // �׹�ѹ¡��ԡ�ҹ
  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener("click", async () => {
      const cancelNote = document.getElementById("cancel_note").value.trim();
      const cancelMileImage = imgPaths.img_cancel_mile;
      const cancelMile = document.getElementById("cancel_mile").value.trim();

      // Validation
      if (!cancelMile) {
        return Swal.fire({
          icon: "warning",
          title: "��سҡ�͡�Ţ����",
          text: "��͡�Ţ����Ѩ�غѹ",
        });
      }
      
      if (!cancelNote) {
        return Swal.fire({
          icon: "warning",
          title: "��سҡ�͡�����˵�",
          text: "�к��˵ؼ�㹡��¡��ԡ�ҹ",
        });
      }

      if (!cancelMileImage) {
        return Swal.fire({
          icon: "warning",
          title: "��سҶ����ٻ����",
          text: "��ͧ�����ٻ�Ţ����Ѩ�غѹ��͹¡��ԡ",
        });
      }

      try {
        Swal.fire({
          title: "���ѧ¡��ԡ�ҹ...",
          text: "��س����ѡ����",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const cancelMile = document.getElementById("cancel_mile").value.trim();
        
        const payload = {
          rec_id,
          cancel_note: cancelNote,
          cancel_mile_image: cancelMileImage,
          cancel_mile: cancelMile,
        };

        const response = await fetch("api/drivers/job/cancel-with-mile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          Swal.fire({
            icon: "warning",
            title: "Session �������",
            text: "��س� Login ����",
            confirmButtonText: "�˹�� Login",
          }).then(() => {
            window.location.href = "login";
          });
          return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("����������觢��������١��ͧ");
        }

        const result = await response.json();

        if (!response.ok || result?.ok === false) {
          throw new Error(result?.detail || "¡��ԡ�ҹ��������");
        }

        await Swal.fire({
          icon: "success",
          title: "¡��ԡ�ҹ�����",
          text: "���ѧ��Ѻ�˹�ҧҹ...",
          timer: 2000,
          showConfirmButton: false,
        });

        // ź rec_id �ҡ sessionStorage
        sessionStorage.removeItem("current_rec_id");

        // ��Ѻ�˹�ҧҹ
        window.location.href = document.referrer || "/driver_job.html";
      } catch (error) {
        console.error("? Error canceling job with mile:", error);
        Swal.fire({
          icon: "error",
          title: "�Դ��ͼԴ��Ҵ",
          text: error.message || "�������ö¡��ԡ�ҹ��",
        });
      }
    });
  }

  /* ================= �����ѹ�֡��������� ================= */
  const btnSaveMileStart = document.getElementById("btn_save_mile_start");
  if (btnSaveMileStart) {
    btnSaveMileStart.addEventListener("click", async () => {
      // Validate all required fields
      const missing = validateRequiredFields([
        { id: "mile_start", label: "�Ţ�����������" }
      ]);

      if (missing.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "��سҡ�͡���������ú��ǹ",
          html: `<div style="text-align: left;">
            <p>�ѧ������͡:</p>
            <ul style="color: #dc3545;">
              ${missing.map(m => `<li>${m}</li>`).join("")}
            </ul>
          </div>`,
          confirmButtonText: "��ŧ",
        });
        return;
      }

      const mile_start = document.getElementById("mile_start").value.trim();
      const img_mile_start_path = imgPaths.img_mile_start;

      console.log("?? mile_start value:", mile_start);
      console.log("?? mile_start type:", typeof mile_start);
      console.log("?? mile_start length:", mile_start.length);
      console.log("?? img_mile_start_path:", img_mile_start_path);

      if (!img_mile_start_path) {
        return showError("��سҶ����ٻ�Ţ���������");
      }

      // Validation �Ţ����
      const pattern = /^\d+$/;
      console.log("?? Testing pattern:", pattern.test(mile_start));
      if (!pattern.test(mile_start)) {
        return showError(
          `�����������ͧ�繵���Ţ��ҹ�� (��ҷ����: "${mile_start}")`
        );
      }

      try {
        Swal.fire({
          title: "���ѧ�ѹ�֡...",
          text: "��س����ѡ����",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const payload = {
          rec_id,
          mile_start,
          img_out: img_mile_start_path,
        };

        console.log("?? Sending payload:", payload);

        const response = await fetch("api/drivers/job/save-mile-start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include", // �� session cookie
          body: JSON.stringify(payload),
        });

        console.log("?? Response status:", response.status);
        console.log(
          "?? Response headers:",
          response.headers.get("content-type")
        );

        // ��Ǩ�ͺ 401 Unauthorized
        if (response.status === 401) {
          Swal.fire({
            icon: "warning",
            title: "Session �������",
            text: "��س� Login ����",
            confirmButtonText: "�˹�� Login",
          }).then(() => {
            window.location.href = "login";
          });
          return;
        }

        // ��Ǩ�ͺ����� JSON �������
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("? Response is not JSON:", text.substring(0, 200));
          throw new Error("����������觢��������١��ͧ (����� JSON)");
        }

        const result = await response.json();
        console.log("?? Response data:", result);

        if (!response.ok || result?.ok === false) {
          throw new Error(result?.detail || "�ѹ�֡��������");
        }

        await Swal.fire({
          icon: "success",
          title: "? �ѹ�֡�����",
          // text: "�ʴ�������Ѵ�...",
          timer: 1500,
          showConfirmButton: false,
        });

        // ? ��駤�� flag ��Һѹ�֡���������
        dataFromDB.mile_start = true;

        // ��͹������ѧ�ѹ�֡�����
        document.getElementById("btn_save_mile_start_container").style.display =
          "none";

        // ������ͧ����������� readonly
        const mileStartInput = document.getElementById("mile_start");
        mileStartInput.readOnly = true;
        mileStartInput.classList.add("readonly-field");

        // ? �ʴ�����¡��ԡ�ҹ (Ẻ��� - ��͹���)
        const btnCancelJobContainer = document.getElementById("btn_cancel_job_container");
        if (btnCancelJobContainer) {
          btnCancelJobContainer.style.display = "none"; // ��͹Ẻ���
        }

        // ? �ʴ�����¡��ԡ�ҹẺ���� (������ٻ����) ���ǹ㺪���͡
        const btnCancelWithMileContainer = document.getElementById("btn_cancel_with_mile_container");
        if (btnCancelWithMileContainer) {
          btnCancelWithMileContainer.style.display = "block";
        }

        // ? �ʴ����촶Ѵ�
        updateFormSections();
      } catch (error) {
        console.error("? Error saving mile_start:", error);
        Swal.fire({
          icon: "error",
          title: "�Դ��ͼԴ��Ҵ",
          html: `
                  <p>${error.message || error.detail || String(error)}</p>
                  <small class="text-muted">��سҵ�Ǩ�ͺ Console ����Ѻ��������´�������</small>
                `,
        });
      }
    });
  }

  /* ================= �����ѹ�֡���˹ѡ�鹷ҧ ================= */
  const btnSaveWtOrigin = document.getElementById("btn_save_wt_origin");
  if (btnSaveWtOrigin) {
    btnSaveWtOrigin.addEventListener("click", async () => {
      // Validate all required fields
      const missing = validateRequiredFields([
        { id: "ticket_number_origin", label: "�Ţ���㺪��" },
        { id: "wt_before_pick", label: "���˹ѡ���" },
        { id: "wt_after_pick", label: "���˹ѡ�͡" }
      ]);

      if (missing.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "��سҡ�͡���������ú��ǹ",
          html: `<div style="text-align: left;">
            <p>�ѧ������͡:</p>
            <ul style="color: #dc3545;">
              ${missing.map(m => `<li>${m}</li>`).join("")}
            </ul>
          </div>`,
          confirmButtonText: "��ŧ",
        });
        return;
      }

      const ticket_number = document
        .getElementById("ticket_number_origin")
        .value.trim();
      const wt_before_pick = document
        .getElementById("wt_before_pick")
        .value.trim();
      const wt_after_pick = document
        .getElementById("wt_after_pick")
        .value.trim();
      const img_wt_origin_paths = imgPaths.img_wt_origin || [];

      // �֧�����Ũҡ hidden fields (�����ҡ OCR ����)
      const vehicle_plate = document.getElementById("regno_out")?.value || null;
      const remark1 = document.getElementById("remark_1")?.value || null;
      const remark2 = document.getElementById("remark_2")?.value || null;
      const remark3 = document.getElementById("remark_3")?.value || null;

      console.log("?? Hidden fields data:", {
        vehicle_plate,
        remark1,
        remark2,
        remark3,
      });

      console.log("?? wt_origin data to save:", {
        ticket_number,
        wt_before_pick,
        wt_after_pick,
        vehicle_plate,
        remark1,
        remark2,
        remark3,
        img_wt_origin_paths,
      });

      if (!wt_before_pick) {
        return showError("��سҡ�͡���˹ѡ���");
      }

      if (!wt_after_pick) {
        return showError("��سҡ�͡���˹ѡ�͡");
      }

      if (img_wt_origin_paths.length === 0) {
        return showError("��سҶ����ٻ㺪�觹��˹ѡ�鹷ҧ");
      }

      if (wt_before_pick && Number(wt_before_pick) < 0) {
        return showError("���˹ѡ��ҵ�ͧ���Դź");
      }
      if (wt_after_pick && Number(wt_after_pick) < 0) {
        return showError("���˹ѡ�͡��ͧ���Դź");
      }

      // ��Ǩ�ͺ��Ҫ���ҵ�ͧ���¡��Ҫ��˹ѡ
      if (wt_before_pick && wt_after_pick) {
        if (Number(wt_before_pick) >= Number(wt_after_pick)) {
          return showError("���˹ѡ����� ��ͧ���¡��� ���˹ѡ���˹ѡ ��Ǩ�ͺ㺪���ա����");
        }
      }

      try {
        Swal.fire({
          title: "���ѧ�ѹ�֡...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const payload = {
          rec_id,
          wt_before_pick: wt_before_pick ? Math.round(Number(wt_before_pick)) : null,
          wt_after_pick: wt_after_pick ? Math.round(Number(wt_after_pick)) : null,
          regno_out: vehicle_plate,
          billnumber_out: ticket_number || null,
          remark_1: remark1,
          remark_2: remark2,
          remark_3: remark3,
          imgbill_out: img_wt_origin_paths,
        };

        console.log("?? Sending wt_origin payload:", payload);

        const response = await fetch("api/drivers/job/save-wt-origin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("?? Response status:", response.status);

        if (response.status === 401) {
          Swal.fire({
            icon: "warning",
            title: "Session �������",
            text: "��س��������к�����",
          });
          setTimeout(() => (location.href = "login"), 2000);
          return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("���������ͺ��Ѻ��ٻẺ������١��ͧ");
        }

        const result = await response.json();
        console.log("?? Response data:", result);

        if (!response.ok || result?.ok === false) {
          throw new Error(result?.detail || "�ѹ�֡��������");
        }

        await Swal.fire({
          icon: "success",
          title: "? �ѹ�֡�����",
          timer: 1500,
          showConfirmButton: false,
        });

        // ? �ѹ�֡��������Ƕ֧�� update flag
        dataFromDB.wt_before_pick = true;

        document.getElementById("btn_save_wt_origin_container").style.display =
          "none";
        document.getElementById("ticket_number_origin").readOnly = true;
        document.getElementById("wt_before_pick").readOnly = true;
        document.getElementById("wt_after_pick").readOnly = true;
        document
          .getElementById("ticket_number_origin")
          .classList.add("readonly-field");
        document
          .getElementById("wt_before_pick")
          .classList.add("readonly-field");
        document
          .getElementById("wt_after_pick")
          .classList.add("readonly-field");

        // ? �ʴ����촶Ѵ�
        updateFormSections();
      } catch (error) {
        console.error("? Error saving wt_origin:", error);
        
        // �Ţ�ͤ��� error ����������·�����㨧���
        let errorMessage = "�ѹ�֡�������� ��س��ͧ�����ա����";
        const errorStr = String(error.message || error.detail || error);
        
        if (errorStr.includes("invalid input syntax for type integer")) {
          errorMessage = "��س��кع��˹ѡ�繵���Ţ��ҹ��";
        } else if (errorStr.includes("Session") || errorStr.includes("401")) {
          errorMessage = "Session ������� ��س��������к�����";
        } else if (error.detail) {
          errorMessage = error.detail;
        }
        
        Swal.fire({
          icon: "error",
          title: "�Դ��ͼԴ��Ҵ",
          text: errorMessage,
        });
      }
    });
  }

  /* ================= �����ѹ�֡���˹ѡ���·ҧ ================= */
  const btnSaveWtDest = document.getElementById("btn_save_wt_dest");
  if (btnSaveWtDest) {
    btnSaveWtDest.addEventListener("click", async () => {
      // Validate all required fields (��ͧ��͡���˹ѡ��� 2 ���)
      const missing = validateRequiredFields([
        { id: "wt_arrive_dest", label: "���˹ѡ���" },
        { id: "wt_leave_dest", label: "���˹ѡ�͡" }
      ]);

      if (missing.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "��سҡ�͡���������ú��ǹ",
          html: `<div style="text-align: left;">
            <p>�ѧ������͡:</p>
            <ul style="color: #dc3545;">
              ${missing.map(m => `<li>${m}</li>`).join("")}
            </ul>
          </div>`,
          confirmButtonText: "��ŧ",
        });
        return;
      }

      const ticket_number = document
        .getElementById("ticket_number_dest")
        .value.trim();
      const wt_arrive_dest = document
        .getElementById("wt_arrive_dest")
        .value.trim();
      const wt_leave_dest = document
        .getElementById("wt_leave_dest")
        .value.trim();
      const img_wt_dest_paths = imgPaths.img_wt_dest || [];

      // �֧�����Ũҡ hidden fields (�� fields ���ǡѹ�Ѻ�鹷ҧ)
      const vehicle_plate = document.getElementById("regno_in")?.value || null;
      const remark1 = document.getElementById("remark_1")?.value || null;
      const remark2 = document.getElementById("remark_2")?.value || null;
      const remark3 = document.getElementById("remark_3")?.value || null;

      console.log("?? Hidden fields data (Destination):", {
        vehicle_plate,
        remark1,
        remark2,
        remark3,
      });

      console.log("?? wt_dest data to save:", {
        ticket_number,
        wt_arrive_dest,
        wt_leave_dest,
        img_wt_dest_paths,
        vehicle_plate,
        remark1,
        remark2,
        remark3,
      });

      // �ٻ㺪�����ѧ�Ѻ����Ѻ㺪�����
      // if (img_wt_dest_paths.length === 0) {
      //   return showError("��سҶ����ٻ㺪�觹��˹ѡ���·ҧ");
      // }

      if (wt_arrive_dest && Number(wt_arrive_dest) < 0) {
        return showError("���˹ѡ��ҵ�ͧ���Դź");
      }
      if (wt_leave_dest && Number(wt_leave_dest) < 0) {
        return showError("���˹ѡ�͡��ͧ���Դź");
      }

      // ��Ǩ�ͺ���˹ѡ�͡ (�����) ��ͧ���¡��ҹ��˹ѡ��� (���˹ѡ)
      if (Number(wt_leave_dest) >= Number(wt_arrive_dest)) {
        return showError("���˹ѡ����� ��ͧ���¡��� ���˹ѡ���˹ѡ ��Ǩ�ͺ㺪���ա����");
      }

      try {
        Swal.fire({
          title: "���ѧ�ѹ�֡...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const payload = {
          rec_id,
          wt_arrive_dest: wt_arrive_dest ? Math.round(Number(wt_arrive_dest)) : null,
          wt_leave_dest: wt_leave_dest ? Math.round(Number(wt_leave_dest)) : null,
          regno_in: vehicle_plate,
          billnumber_in: ticket_number || null,
          remark_1: remark1,
          remark_2: remark2,
          remark_3: remark3,
          imgbill_in: img_wt_dest_paths,
        };

        console.log("?? Sending wt_dest payload:", payload);

        const response = await fetch("api/drivers/job/save-wt-dest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("?? Response status:", response.status);

        if (response.status === 401) {
          Swal.fire({
            icon: "warning",
            title: "Session �������",
            text: "��س��������к�����",
          });
          setTimeout(() => (location.href = "login"), 2000);
          return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("���������ͺ��Ѻ��ٻẺ������١��ͧ");
        }

        const result = await response.json();
        console.log("?? Response data:", result);

        if (!response.ok || result?.ok === false) {
          throw new Error(result?.detail || "�ѹ�֡��������");
        }

        await Swal.fire({
          icon: "success",
          title: "? �ѹ�֡�����",
          timer: 1500,
          showConfirmButton: false,
        });

        // ? �ѹ�֡��������Ƕ֧�� update flag ��Ы�͹ card
        dataFromDB.wt_arrive_dest = true;

        document.getElementById("btn_save_wt_dest_container").style.display =
          "none";
        document.getElementById("ticket_number_dest").readOnly = true;
        document.getElementById("wt_arrive_dest").readOnly = true;
        document.getElementById("wt_leave_dest").readOnly = true;
        document
          .getElementById("ticket_number_dest")
          .classList.add("readonly-field");
        document
          .getElementById("wt_arrive_dest")
          .classList.add("readonly-field");
        document
          .getElementById("wt_leave_dest")
          .classList.add("readonly-field");

        // ? �ʴ����촶Ѵ�
        updateFormSections();
      } catch (error) {
        console.error("? Error saving wt_dest:", error);
        
        // �Ţ�ͤ��� error ����������·�����㨧���
        let errorMessage = "�ѹ�֡�������� ��س��ͧ�����ա����";
        const errorStr = String(error.message || error.detail || error);
        
        if (errorStr.includes("invalid input syntax for type integer")) {
          errorMessage = "��س��кع��˹ѡ�繵���Ţ��ҹ��";
        } else if (errorStr.includes("Session") || errorStr.includes("401")) {
          errorMessage = "Session ������� ��س��������к�����";
        } else if (error.detail) {
          errorMessage = error.detail;
        }
        
        Swal.fire({
          icon: "error",
          title: "�Դ��ͼԴ��Ҵ",
          text: errorMessage,
        });
      }
    });
  }

  /* ================= �����ѹ�֡��������ش ================= */
  const btnSaveMileEnd = document.getElementById("btn_save_mile_end");
  if (btnSaveMileEnd) {
    btnSaveMileEnd.addEventListener("click", async () => {
      // Validate all required fields
      const missing = validateRequiredFields([
        { id: "mile_end", label: "�Ţ��������ش" }
      ]);

      if (missing.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "��سҡ�͡���������ú��ǹ",
          html: `<div style="text-align: left;">
            <p>�ѧ������͡:</p>
            <ul style="color: #dc3545;">
              ${missing.map(m => `<li>${m}</li>`).join("")}
            </ul>
          </div>`,
          confirmButtonText: "��ŧ",
        });
        return;
      }

      const mile_end = document.getElementById("mile_end").value.trim();
      const img_mile_end_path = imgPaths.img_mile_end;

      console.log("?? mile_end value:", mile_end);
      console.log("?? mile_end type:", typeof mile_end);
      console.log("?? img_mile_end_path:", img_mile_end_path);

      if (!mile_end) {
        return showError("��سҡ�͡�Ţ��������ش");
      }

      if (!img_mile_end_path) {
        return showError("��سҶ����ٻ�Ţ��������ش");
      }

      // Validation �Ţ����
      const pattern = /^\d+$/;
      if (!pattern.test(mile_end)) {
        return showError(
          `��������ش��ͧ�繵���Ţ��ҹ�� (��ҷ����: "${mile_end}")`
        );
      }

      // ��Ǩ�ͺ�����������ش�ҡ�������������
      const mile_start = document.getElementById("mile_start").value.trim();
      if (mile_start) {
        const startNum = parseInt(mile_start, 10);
        const endNum = parseInt(mile_end, 10);
        if (endNum <= startNum) {
          return showError("��������ش��ͧ�ҡ�������������");
        }
      }

      try {
        Swal.fire({
          title: "���ѧ�ѹ�֡...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        // ������ (UTC+7)
        const end_datetime = new Date(Date.now() + 7 * 60 * 60 * 1000)
          .toISOString()
          .replace("Z", "+07:00");

        const payload = {
          rec_id,
          mile_end,
          img_end: img_mile_end_path,
          end_datetime,
        };

        console.log("?? Sending payload:", payload);

        const response = await fetch("api/drivers/job/save-mile-end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        console.log("?? Response status:", response.status);

        // ��Ǩ�ͺ 401 Unauthorized
        if (response.status === 401) {
          Swal.fire({
            icon: "warning",
            title: "Session �������",
            text: "��س��������к�����",
            confirmButtonText: "�˹�� Login",
          }).then(() => {
            window.location.href = "login";
          });
          return;
        }

        // ��Ǩ�ͺ����� JSON �������
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("? Response is not JSON:", text.substring(0, 200));
          throw new Error("����������觢��������١��ͧ (����� JSON)");
        }

        const result = await response.json();
        console.log("?? Response data:", result);

        if (!response.ok || result?.ok === false) {
          throw new Error(result?.detail || "�ѹ�֡��������");
        }

        await Swal.fire({
          icon: "success",
          title: "? �ѹ�֡�����",
          text: "���ҹ����",
          timer: 1500,
          showConfirmButton: false,
          allowOutsideClick: false,
        });

        // ź rec_id �ҡ sessionStorage
        sessionStorage.removeItem("current_rec_id");

        // ��Ѻ˹�� driver_job �ѹ��
        window.location.href = "driver_job";
      } catch (error) {
        console.error("? Error saving mile_end:", error);
        Swal.fire({
          icon: "error",
          title: "�Դ��ͼԴ��Ҵ",
          html: `
                  <p>${error.message || error.detail || String(error)}</p>
                  <small class="text-muted">��سҵ�Ǩ�ͺ Console ����Ѻ��������´�������</small>
                `,
        });
      }
    });
  }

  /* ================= Camera Functions (����������� IIFE) ================= */
  console.log("?? Initializing Camera Functions...");

  // ��Ǩ�ͺ��� CameraHandler ��Ŵ����
  if (typeof CameraHandler === "undefined") {
    console.error(
      "? CameraHandler not loaded! Check if /js/camera.js is loaded correctly."
    );
    showError("�������ö��Ŵ�к����ͧ�� ��س����ê˹�����");
    return; // ��ش��÷ӧҹ
  }
  console.log("? CameraHandler loaded");

  // ��Ǩ�ͺ��� Bootstrap ��Ŵ����
  if (typeof bootstrap === "undefined") {
    console.error(
      "? Bootstrap not loaded! Check if bootstrap.bundle.min.js is loaded correctly."
    );
    showError("�������ö��Ŵ Bootstrap �� ��س����ê˹�����");
    return; // ��ش��÷ӧҹ
  }
  console.log("? Bootstrap loaded");

  const camera = new CameraHandler();
  console.log("? Camera instance created");

  const cameraModalEl = document.getElementById("cameraModal");
  console.log("cameraModalEl:", cameraModalEl);

  if (!cameraModalEl) {
    console.error("? cameraModal element not found!");
    return;
  }

  const cameraModal = new bootstrap.Modal(cameraModalEl);
  console.log("? Modal instance created");

  const cameraVideo = document.getElementById("cameraVideo");
  const btnSwitchCamera = document.getElementById("btnSwitchCamera");
  const btnCapturePhoto = document.getElementById("btnCapturePhoto");
  const btnUsePhoto = document.getElementById("btnUsePhoto");
  const capturedPreview = document.getElementById("capturedPreview");
  const focusFrame = document.getElementById("focusFrame");
  const focusGuideText = document.getElementById("focusGuideText");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const zoomLevelDisplay = document.getElementById("zoomLevel");

  console.log("Modal elements:", {
    cameraVideo,
    btnSwitchCamera,
    btnCapturePhoto,
    btnUsePhoto,
    capturedPreview,
    focusFrame,
  });

  let currentFieldName = null;
  let capturedPhotoData = null;
  let currentZoom = 1.0;

  // �ѧ��ѹ����¹��ͺ⿡�ʵ��������
  function setFocusFrameType(fieldName) {
    // ��駤�ҡ�ͺ��Т�ͤ�������������ٻ
    if (fieldName.includes("mile")) {
      // �ٻ���� - ��ͺ�ǹ͹᤺ (����Ѻ˹�һѴ)
      focusFrame.className = "focus-frame horizontal";
      focusGuideText.innerHTML =
        '<span class="icon">??</span> �ҧ����Ţ�����������㹡�ͺ';
    } else if (fieldName.includes("wt")) {
      // �ٻ㺪�觹��˹ѡ - ��ͺ�ǹ͹���ҧ (����Ѻ㺪�� A4)
      focusFrame.className = "focus-frame horizontal-wide";
      focusGuideText.innerHTML =
        '<span class="icon">??</span> �ҧ㺪�������繵���Ţ���˹ѡ�Ѵਹ';
    }
  }

  // �ѧ��ѹ�Դ���ͧ
  async function openCameraForField(fieldName) {
    console.log("?? openCameraForField called with:", fieldName);

    currentFieldName = fieldName;
    capturedPhotoData = null;
    capturedPreview.innerHTML = "";
    btnUsePhoto.classList.add("d-none");
    btnCapturePhoto.textContent = "?? �����ٻ";

    // ��駤�ҡ�ͺ⿡��
    setFocusFrameType(fieldName);

    // ? �ʴ���ͺ⿡���ա����
    if (focusFrame) {
      focusFrame.style.display = "block";
      console.log("? Focus frame displayed:", focusFrame.className);
    }

    console.log("?? Opening camera modal...");
    cameraModal.show();

    // �� modal �Դ���稡�͹�Դ���ͧ
    setTimeout(async () => {
      const result = await camera.openCamera(cameraVideo, {
        facingMode: "environment",
      });
      if (!result.ok) {
        Swal.fire({
          icon: "error",
          title: "�������ö�Դ���ͧ��",
          text: result.message,
        });
        cameraModal.hide();
      }
    }, 300);
  }

  // ��Ѻ���ͧ
  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener("click", async () => {
      console.log("?? Switch camera button clicked");
      const result = await camera.switchCamera();
      if (!result.ok) {
        Swal.fire({
          icon: "warning",
          title: "��Ѻ���ͧ��������",
          text: result.message,
          timer: 2000,
        });
      }
    });
  }

  // �ѧ��ѹ Zoom
  function applyZoom(zoomLevel) {
    if (cameraVideo && cameraVideo.style) {
      cameraVideo.style.transform = `scale(${zoomLevel})`;
      cameraVideo.style.transformOrigin = "center center";
      zoomLevelDisplay.textContent = `${zoomLevel.toFixed(1)}x`;
    }
  }

  // ���� Zoom In
  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", () => {
      if (currentZoom < 3.0) {
        currentZoom = Math.min(3.0, currentZoom + 0.2);
        applyZoom(currentZoom);
      }
    });
  }

  // ���� Zoom Out
  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", () => {
      if (currentZoom > 1.0) {
        currentZoom = Math.max(1.0, currentZoom - 0.2);
        applyZoom(currentZoom);
      }
    });
  }

  // �����ٻ
  if (btnCapturePhoto) {
    console.log("? Capture button found, adding event listener");
    btnCapturePhoto.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("?? Capture photo button clicked");
      console.log("Current field:", currentFieldName);
      console.log("Current button text:", btnCapturePhoto.textContent);

      // ��ҡ����� "��������" ��������� preview ��С�Ѻ�ʶҹо��������
      const isRetake = btnCapturePhoto.textContent.includes("��������");
      if (isRetake) {
        console.log("?? Retake photo - clearing preview and showing camera again");

        // ��������������
        capturedPhotoData = null;
        capturedPreview.innerHTML = "";
        btnUsePhoto.classList.add("d-none");
        btnCapturePhoto.textContent = "?? �����ٻ";

        // �ʴ���ͺ⿡���ա����
        if (focusFrame) {
          focusFrame.style.display = "block";
        }

        // �ʴ� video stream �ա���� (���ͧ�ѧ�Դ����)
        if (cameraVideo) {
          cameraVideo.style.display = "block";
        }

        return; // ��ش����� ��������顴���������ٻ�ա����
      }

      // ��Ǩ�ͺ����������ͧ���ͧ (����Ѻ��ö����ٻ�����á)
      if (!currentFieldName) {
        alert("��辺���Ϳ�Ŵ�");
        return;
      }

      if (!cameraVideo || cameraVideo.videoWidth === 0) {
        alert("���ͧ�ѧ������� ��س����ѡ����");
        return;
      }

      try {
        console.log("?? Taking photo...");

        // ����˹�����ѷ�� (%) ᷹�ԡ��
        const videoWidth = cameraVideo.videoWidth;
        const videoHeight = cameraVideo.videoHeight;

        // ��˹���Ҵ��ͺ⿡�ʵ���������ٻ
        let frameWidthPercent, frameHeightPercent;

        if (currentFieldName.includes("mile")) {
          // ��ͺ�ǹ͹᤺: 85% width, 200px height (����Ѻ˹�һѴ����)
          frameWidthPercent = 0.85;
          frameHeightPercent = 200 / window.innerHeight; // ����ѷ��Ѻ˹�Ҩ�
        } else if (currentFieldName.includes("wt")) {
          // 㺪�� - ��ͺ�ǹ͹���ҧ 90% width, 300px height
          frameWidthPercent = 0.90;
          frameHeightPercent = 300 / window.innerHeight; // ����ѷ��Ѻ˹�Ҩ�
        } else {
          // Default
          frameWidthPercent = 0.85;
          frameHeightPercent = 200 / window.innerHeight;
        }

        // �ӹǳ��Ҵ��ͺ⿡���¤ӹ֧ zoom level
        // ����� zoom �Ҿ ��鹷�����ͧ crop �����ŧ
        const cropWidth = (videoWidth * frameWidthPercent) / currentZoom;
        const cropHeight = (videoHeight * frameHeightPercent) / currentZoom;

        // ���˹觡�ҧ�� (center crop)
        const cropX = (videoWidth - cropWidth) / 2;
        const cropY = (videoHeight - cropHeight) / 2;

        // �����ٻ����� crop �����ͺ⿡��
        capturedPhotoData = camera.capturePhotoWithCrop(
          Math.max(0, cropX),
          Math.max(0, cropY),
          cropWidth,
          cropHeight
        );

        // �ʴ� preview (��͹��ͺ⿡��)
        capturedPreview.innerHTML = `
              <img src="${capturedPhotoData}">
            `;

        // ��͹��ͺ⿡��
        if (focusFrame) {
          focusFrame.style.display = "none";
        }

        // �ʴ��������ٻ �������¹���������� "��������"
        btnUsePhoto.classList.remove("d-none");
        btnCapturePhoto.textContent = "?? ��������";
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "�����ٻ��������",
          text: error.message,
        });
      }
    });
  }

  // ���ٻ������
  if (btnUsePhoto) {
    btnUsePhoto.addEventListener("click", async () => {
      console.log("? Use photo button clicked");
      if (!capturedPhotoData || !currentFieldName) return;

      try {
        Swal.fire({
          title: "���ѧ�ѻ��Ŵ...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        // �ŧ base64 �� blob
        const blob = camera.base64ToBlob(capturedPhotoData);
        const formData = new FormData();

        // ��駪��������������
        let filename;
        if (currentFieldName === "img_mile_start") {
          filename = `img_mile_out-${rec_id}.jpg`;
        } else {
          const timestamp = Date.now();
          filename = `${currentFieldName}_${timestamp}.jpg`;
        }

        console.log("?? Filename:", filename);
        formData.append(currentFieldName, blob, filename);
        formData.append("rec_id", rec_id);

        // �ѻ��Ŵ
        const response = await fetch("api/upload-images", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.ok) {
          // �ѻവ imgPaths
          const p = result.previewPaths || {};
          if (
            currentFieldName === "img_mile_start" ||
            currentFieldName === "img_mile_end"
          ) {
            imgPaths[currentFieldName] = p[currentFieldName]?.[0] || null;
          } else {
            const uniq = (arr) => [...new Set(arr.filter(Boolean))];
            imgPaths[currentFieldName] = uniq([
              ...(imgPaths[currentFieldName] || []),
              ...(p[currentFieldName] || []),
            ]);
          }

          // ? ���¡ OCR �ѹ����ѧ�ѻ��Ŵ�����
          Swal.fire({
            title: "?? ���ѧ��ҹ������...",
            text: "��س����ѡ����",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          const imagePath = p[currentFieldName]?.[0];
          if (imagePath) {
            // ��˹� tag ������� field
            let tag = currentFieldName.replace("img_", "");

            const ocrResponse = await fetchJSONLocal(
              "api/ocr",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rec_id, tag, imagePath }),
              },
              { timeoutMs: 45000 }
            );

            if (ocrResponse && ocrResponse.ok !== false) {
              // ����ҷ����ҹ��ŧ㹪�ͧ input
              applyOcrToFields(ocrResponse, tag);

              // ����ŧ done set ���������ҹ���
              ocrDoneSet.add(imagePath);

              // �ѻവ����ʴ��ſ���� (�ʴ������ѹ�֡���������)
              updateFormSections();

              Swal.fire({
                icon: "success",
                title: "? ��ҹ�����������",
                text: "��͡���������º��������",
                timer: 2000,
                showConfirmButton: false,
              });
            } else {
              throw new Error("OCR ��������");
            }
          }

          // �Դ modal ����Ѿഷ preview
          cameraModal.hide();
          camera.closeCamera();
          renderPreview();
        } else {
          throw new Error(result.detail || "�ѻ��Ŵ��������");
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "�Դ��ͼԴ��Ҵ",
          text: error.message || error,
        });
      }
    });
  }

  // �Դ���ͧ����ͻԴ modal
  const cameraModalElement = document.getElementById("cameraModal");
  if (cameraModalElement) {
    cameraModalElement.addEventListener("hidden.bs.modal", () => {
      camera.closeCamera();
      capturedPhotoData = null;
      currentFieldName = null;
      capturedPreview.innerHTML = "";
      btnUsePhoto.classList.add("d-none");
      btnCapturePhoto.textContent = "?? �����ٻ";

      // ? �ʴ���ͺ⿡���ա���� (����Ѻ�Դ���駵���)
      if (focusFrame) {
        focusFrame.style.display = "block";
      }

      // Reset zoom
      currentZoom = 1.0;
      applyZoom(currentZoom);
    });
    console.log("? Modal close event bound");
  } else {
    console.error("? cameraModal element not found for event binding");
  }

  // �١���������ٻ������ �� Event Delegation �����ͧ�Ѻ dynamic content
  console.log("?? Binding camera buttons with event delegation...");

  // ��Ǩ�ͺ����ջ������ͧ�������
  const allCameraBtns = document.querySelectorAll(
    ".btn-camera, .btn-camera-weight"
  );
  console.log("?? Found camera buttons:", allCameraBtns.length, allCameraBtns);

  // �� event delegation ��� document level �������ӧҹ�Ѻ element ����͹�����ʴ�����
  document.addEventListener("click", (e) => {
    console.log("?? Click detected on:", e.target);

    // ��Ǩ�ͺ��� 2 ������: �������� ��л���㺪��
    const targetMile = e.target.closest(".btn-camera");
    const targetWeight = e.target.closest(".btn-camera-weight");
    const target = targetMile || targetWeight;

    console.log("?? Closest button:", target);

    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const buttonId = target.id;
    console.log("?? Camera button clicked:", buttonId);

    // ��� button ID �Ѻ field name
    const fieldMap = {
      btn_camera_mile_start: "img_mile_start",
      btn_camera_mile_end: "img_mile_end",
      btn_camera_wt_origin: "img_wt_origin",
      btn_camera_wt_dest: "img_wt_dest",
      btn_camera_cancel_mile: "img_cancel_mile",
    };

    const fieldName = fieldMap[buttonId];
    if (fieldName) {
      console.log("?? Opening camera for field:", fieldName);
      openCameraForField(fieldName);
    } else {
      console.error("? Unknown camera button:", buttonId);
    }
  });

  console.log("? Camera buttons bound with event delegation");

  // �١�������͡��� (����� - �Ѩ�غѹ��������ͧ���ҧ����)
  const uploadButtons = [
    { btnId: "btn_upload_mile_start", inputId: "img_mile_start" },
    { btnId: "btn_upload_mile_end", inputId: "img_mile_end" },
    { btnId: "btn_upload_wt_origin", inputId: "img_wt_origin" },
    { btnId: "btn_upload_wt_dest", inputId: "img_wt_dest" },
  ];

  uploadButtons.forEach(({ btnId, inputId }) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    if (btn && input) {
      btn.addEventListener("click", () => {
        input.click();
      });
      console.log(`? Upload button bound: ${btnId}`);
    } else {
      console.log(
        `?? Upload button not found: ${btnId} (������� ����ͧ���ҧ����)`
      );
    }
  });

  // �������
  console.log("?? Initializing preview and form sections...");
  renderPreview();
  updateFormSections(); // ���¡�����á�������Ŵ˹��
  console.log("? Initialization complete!");
})(); // �Դ IIFE �����
