function redeemStamp(stampNumber) {
  const stampElement = document.getElementById(`stamp${stampNumber}`);

  if (stampElement) {
    const icon = stampElement.querySelector('.stamp-icon');
    icon.classList.remove('grayscale', 'opacity-40', 'border-dashed');
    icon.classList.add('border-solid', 'border-[#6e1a06]/20');

    const label = stampElement.querySelector('.stamp-label');
    label.classList.remove('text-gray-300');
    label.classList.add('text-[#6e1a06]');

    updateProgress();
  }
}

function showLoading(loadingText="Loading...") {
  const loader = document.getElementById('loadingOverlay');
  loader.classList.remove('opacity-0', 'pointer-events-none');
  document.getElementById("loading-text").innerText=loadingText
}

function hideLoading() {
  const loader = document.getElementById('loadingOverlay');
  loader.classList.add('opacity-0', 'pointer-events-none');
}

function updateProgress() {
  const total = 6;
  const redeemedCount = document.querySelectorAll('.stamp-icon:not(.grayscale)').length;
  const progressText = document.getElementById('progtext');

  if (progressText) {
    progressText.innerText = `${redeemedCount} / ${total} Stamps Collected`;
  }
}

function closeModal() {
  const modal = document.getElementById('rewardModal');
  const content = document.getElementById('modalContent');
  
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.add('scale-90');
}

function openModal() {
  const modal = document.getElementById('rewardModal');
  const content = document.getElementById('modalContent');

  confetti({
    count: 300,
    fade: false	
  });
  
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-90');
}

function fullreset() {
  localStorage.removeItem("device_id");
  deleteCookie("device_id");
}

function showError(title="Error", description="We couldn't complete your request at the moment. Please try again later.") {
  hideLoading();
  document.getElementById('error-title').innerText = title;
  document.getElementById('error-desc').innerHTML = description;
  
  const errorOverlay = document.getElementById('errorOverlay');
  errorOverlay.classList.remove('opacity-0', 'pointer-events-none');
}
function hideError() {
  const errorOverlay = document.getElementById('errorOverlay');
  errorOverlay.classList.add('opacity-0', 'pointer-events-none');
}

let thisIP = null;

async function callServer(requestType, args = {}) {
  if (!thisIP) {
    try {
      thisIP = (await (await fetch("https://api.ipify.org?format=json")).json()).ip;
    } catch (e) {
      console.log("IP FETCH FAILED", e);
    }
  }

  console.log("IP", thisIP);

  args["requestType"] = requestType;
  args["IP"] = thisIP || "U";
  return fetch("https://script.google.com/macros/s/AKfycbz7sqi_3OM0l7qhmT2J8-kW9gvNzyA2s6JW6EnKemE2sJZxPVgCMbf2ZAxoBZrL2SnK6A/exec",{
    method: "POST",
    headers: {"Content-Type": "text/plain"},
    body: JSON.stringify(args)
  });
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1] || null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

async function fetchstamps() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = getCookie("device_id");
  }
  showLoading("Retrieving stamps...");
  const res = await callServer("QUERY", {"deviceID": id});
  if (!res.ok) {
    showError("Error");
    return false;
  }
  const queryres = await res.json();
  if (queryres.status !== "ok") {
    showError("Device Error", "<big>\""+queryres.status+"\"</big><br><small>"+id+"</small><br>Please try again later!<br><br><small>Contact ETC staff members if the issue persist!</small>");
    return false;
  }

  let stamps = String(queryres.result[2]).split("|"); // encoded as "1|2|3|..."
  let c = 0
  stamps.forEach(element => {
    redeemStamp(Number(element));
    c+=1;
  });
  if (c>=4 && !queryres.result[3]) {
    openModal();
  }
  return true;
}

let initdone = false;
async function init() {
  const stampcontainer = document.getElementById("stamp-container");
  stampcontainer.innerHTML = "";
  showLoading("Initializing...");
  for (let i = 1; i <= 6; i++) {
    stampcontainer.innerHTML+=`
    <div id="stamp${i}" class="group flex flex-col items-center z-10">
      <div class="stamp-icon h-[15vh] aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-3 grayscale opacity-40 transition-all duration-500">
        <img src="stamps/${i}.jpg" alt="Stamp 1" class="max-w-full max-h-full object-contain">
      </div>
      <p class="stamp-label mt-2 text-[9px] md:text-[10px] tracking-[0.15em] font-bold uppercase text-gray-300 transition-colors duration-500">
        Booth ti ${i}
      </p>
    </div>`
  }

  const urlParams = new URLSearchParams(window.location.search);

  let id = localStorage.getItem("device_id");
  if (!id) {
    id = getCookie("device_id");
  }

  let firstimer = false;
  if (!id) {
    console.log("Triggered registration");
    if (localStorage.getItem("registering") === "true") return;
    localStorage.setItem("registering", "true");
    showLoading("Registering...");
    const res = await callServer("DEVICEREGIS");
    if (!res.ok) {
      showError("Error", "We couldn't register your device at the moment. Please try again.");
      localStorage.removeItem("registering");
      return;
    }
    let deviceid = (await res.json()).deviceID;
    localStorage.setItem("device_id", deviceid);
    setCookie("device_id", deviceid);
    id = deviceid;
    firstimer = true;
    localStorage.removeItem("registering");
  }

  let qrscanned = urlParams.get("scannedqr");

  if (qrscanned) {
    firstimer = true;
    window.history.replaceState({}, document.title, window.location.pathname);
    showLoading("Collecting this stamp...");
    const res = await callServer("REDEEM", {"deviceID": id, "qrID": qrscanned});
    if (!res.ok) {
      showError("Error");
      return;
    }
    const queryres = await res.json();
    if (queryres.status !== "ok" && queryres.status !== "qrredeemdupe") {
      showError("Device Error", "<big>\""+queryres.status+"\"</big><br><small>"+id+"</small><br>Please try again later!<br><br><small>Contact ETC staff members if the issue persist!</small>");
      return;
    }
    if (queryres.status === "qrredeemdupe") {
      showLoading("This QR code has already been redeemed");
    } else {
      confetti({
        count: 300,
        fade: true	
      });
    }

    //DATE	SESSIONID	STAMPS	LOTTONUM
    let stamps = String(queryres.result[2]).split("|"); // encoded as "1|2|3|..."
    let c = 0
    stamps.forEach(element => {
      redeemStamp(Number(element));
      c+=1;
    });
    if (c>=4 && !queryres.result[3]) {
      openModal();
    }
  }

  if (!firstimer) {
    if (!(await fetchstamps())) {
      return;
    }
  }
  hideLoading();
}

async function initwrapper() {
  await init();
  initdone = true;
}

initwrapper();
let fetching_db = false;
document.addEventListener("visibilitychange", async function () {
  if (!initdone || fetching_db) {return;}
  if (document.visibilityState === "visible") {
    fetching_db = true;
    await fetchstamps()
    hideLoading();
    fetching_db = false;
  }
});
//openModal()