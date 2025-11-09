// app.js — PokemonBank (Etapa 2)
// -------------------------------------------------------------
// Datos del usuario de demostración (se inicializan en cliente)
const USER = {
  pin: "1234",                     // PIN DEMO (mantengo 1111 como me pediste)
  owner: "Ash Ketchum",
  account: "0987654321",
  balance: 500.00                  // Saldo inicial $500.00
};

// -------------------------------------------------------------
// Utilidades rápidas
const el  = (sel) => document.querySelector(sel);
const fmt = (n) => Number(n).toLocaleString("en-US", { style:"currency", currency:"USD" });

// Estado de la app (se persiste en localStorage)
let state = {
  logged: false,
  balance: USER.balance,
  tx: [] // {date, type, detail, amount, balance}
};

// Clave de almacenamiento
const KEY = "pokemonbank-app-v2";

// Guardar / Cargar en localStorage
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem(KEY);
  if(raw){
    try{ state = JSON.parse(raw); }catch(_){}
  }else{
    save();
  }
}

// -------------------------------------------------------------
// Render de textos de cabecera / navegación
function renderNavUser(){
  el("#navUser") && (el("#navUser").textContent = state.logged ? `${USER.owner} · ${USER.account}` : "");
}
function renderHeader(){
  el("#ownerName")      && (el("#ownerName").textContent      = USER.owner);
  el("#accountNumber")  && (el("#accountNumber").textContent  = USER.account);
  el("#balance")        && (el("#balance").textContent        = fmt(state.balance));
}

// Mostrar vistas
function show(view){
  const login = el("#view-login");
  const dash  = el("#view-dashboard");
  if(login) login.classList.add("d-none");
  if(dash)  dash.classList.add("d-none");
  if(view==="login" && login) login.classList.remove("d-none");
  if(view==="dash"  && dash ) dash.classList.remove("d-none");
}

// -------------------------------------------------------------
// Historial
function labelType(t){
  return ({
    deposit : "Depósito",
    withdraw: "Retiro",
    bill    : "Pago servicio",
    check   : "Consulta"
  }[t] || t);
}

function addTx(type, detail, amount){
  const tx = {
    date   : new Date().toLocaleString("es-SV"),
    type,
    detail: detail || "-",
    amount: Number(amount) || 0,
    balance: state.balance
  };
  state.tx.unshift(tx);
  save();
  renderHistory();
  updateChart();
}

function renderHistory(){
  const tbody = el("#historyBody");
  if(!tbody) return;
  tbody.innerHTML = state.tx.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${labelType(t.type)}</td>
      <td>${t.detail}</td>
      <td class="text-right">${(t.type==="withdraw"||t.type==="bill")? "-" : ""}${fmt(t.amount)}</td>
      <td class="text-right">${fmt(t.balance)}</td>
    </tr>
  `).join("");
}

// -------------------------------------------------------------
// Gráfico (Chart.js)
let chart;
function initChart(){
  const canvas = document.getElementById("txChart");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Depósitos","Retiros","Pagos","Consultas"],
      datasets: [{
        data: [0,0,0,0],
        // Colores sugeridos: verde, rojo, azul, amarillo
        backgroundColor: ["#28a745","#dc3545","#007bff","#ffc107"]
      }]
    },
    options: {
      legend: { position: "bottom" },
      animation: { duration: 300 }
    }
  });
  updateChart();
}

function updateChart(){
  if(!chart) return;
  const counts = {deposit:0, withdraw:0, bill:0, check:0};
  state.tx.forEach(t => counts[t.type] = (counts[t.type] || 0) + 1);
  chart.data.datasets[0].data = [counts.deposit, counts.withdraw, counts.bill, counts.check];
  chart.update();
}

// -------------------------------------------------------------
// Validaciones (Validate.js)
const amountConstraints = { presence: {allowEmpty:false}, numericality: { greaterThan: 0 } };
const pinConstraints    = { presence: true, format: { pattern: "^\\d{4}$", message: "debe tener 4 dígitos" } };

// -------------------------------------------------------------
// Inicialización principal
function init(){
  // Cargar estado previo
  load();

  // Pintar textos iniciales
  renderNavUser();
  renderHeader();
  renderHistory();
  initChart();

  // -------------------------
  // LOGIN (limpia el PIN si es incorrecto)
  const loginForm = el("#loginForm");
  if(loginForm){
    loginForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const pinInput = el("#pin");
      const pin = (pinInput.value || "").trim();

      const err = validate({pin}, {pin: pinConstraints});
      if(err){
        pinInput.classList.add("is-invalid");
        pinInput.focus();
        return;
      }

      if(pin !== USER.pin){
        swal("PIN incorrecto", "Intenta nuevamente.", "error").then(()=>{
          pinInput.value = "";
          pinInput.classList.add("is-invalid");
          pinInput.focus();
        });
        return;
      }

      // Éxito
      state.logged = true;
      save();
      renderNavUser();
      show("dash");
    });

    // Quitar estado inválido al escribir
    el("#pin") && el("#pin").addEventListener("input", ()=>{
      el("#pin").classList.remove("is-invalid");
    });
  }

  // -------------------------
  // LOGOUT
  const btnLogout = el("#btnLogout");
  if(btnLogout){
    btnLogout.addEventListener("click", ()=>{
      swal({
        title: "¿Cerrar sesión?",
        text: "Tu sesión actual se cerrará.",
        icon: "warning",
        buttons: ["Cancelar","Sí, salir"]
      }).then(ok=>{
        if(ok){
          state.logged = false;
          save();
          renderNavUser();
          show("login");
          const pinInput = el("#pin");
          if(pinInput){ pinInput.value = ""; pinInput.focus(); }
        }
      });
    });
  }

  // -------------------------
  // FORM DE ACCIONES
  const actionForm   = el("#actionForm");
  const actionType   = el("#actionType");
  const serviceGroup = el("#serviceGroup");
  const amountGroup  = el("#amountGroup");
  const amountInput  = el("#amount");
  const serviceSel   = el("#serviceType");

  if(actionType){
    actionType.addEventListener("change", ()=>{
      const v = actionType.value;
      // Mostrar selector de servicio solo para "bill"
      serviceGroup && serviceGroup.classList.toggle("d-none", v !== "bill");
      // Ocultar monto para "check"
      amountGroup  && amountGroup.classList.toggle("d-none", v === "check");
    });
    // Forzar estado inicial correcto
    actionType.dispatchEvent(new Event("change"));
  }

  if(actionForm){
    actionForm.addEventListener("submit", (e)=>{
      e.preventDefault();

      const type    = actionType.value;
      const service = serviceSel ? serviceSel.value : "";
      const amount  = parseFloat(amountInput.value);

      // Validar monto cuando aplique
      if(type !== "check"){
        const vErr = validate({amount}, {amount: amountConstraints});
        if(vErr){
          amountInput.classList.add("is-invalid");
          return;
        }
        amountInput.classList.remove("is-invalid");
      }

      // Lógica de cada transacción
      if(type === "deposit"){
        state.balance += amount;
        addTx("deposit", "Depósito en ventanilla ATM", amount);
        swal("Depósito exitoso", `Nuevo saldo: ${fmt(state.balance)}`, "success");

      }else if(type === "withdraw"){
        if(amount > state.balance){
          swal("Fondos insuficientes", "No puede retirar más del saldo disponible.", "warning");
          return;
        }
        state.balance -= amount;
        addTx("withdraw", "Retiro en efectivo", amount);
        swal("Retiro realizado", `Nuevo saldo: ${fmt(state.balance)}`, "success");

      }else if(type === "bill"){
        if(amount > state.balance){
          swal("Fondos insuficientes", "No puede pagar más del saldo disponible.", "warning");
          return;
        }
        state.balance -= amount;
        addTx("bill", `Pago de ${service}`, amount);
        swal("Pago realizado", `Se pagó ${service}. Saldo: ${fmt(state.balance)}`, "success");

      }else if(type === "check"){
        addTx("check", "Consulta de saldo", 0);
        swal("Saldo actual", `${fmt(state.balance)}`, "info");
      }

      renderHeader();
      save();
      // Limpiar monto tras operar
      if(type !== "check"){ amountInput.value = ""; }
    });
  }

  // -------------------------
  // LIMPIAR HISTORIAL
  const btnClear = el("#btnClearHistory");
  if(btnClear){
    btnClear.addEventListener("click", ()=>{
      swal({
        title: "¿Limpiar historial?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        buttons: ["Cancelar","Sí, borrar"],
        dangerMode: true
      }).then(ok=>{
        if(ok){
          state.tx = [];
          save();
          renderHistory();
          updateChart();
        }
      });
    });
  }

  // -------------------------
  // PDF (jsPDF) — comprobante/estado de cuenta
  const btnPdf = el("#btnDownloadStatement");
  if(btnPdf){
    btnPdf.addEventListener("click", ()=>{
      const { jsPDF } = window.jspdf || {};
      if(!jsPDF){
        swal("jsPDF no cargó", "Verifica la CDN de jsPDF en index.html", "error");
        return;
      }
      const doc = new jsPDF({unit:"pt"});
      let y = 40;

      // Encabezado
      doc.setFont("helvetica","bold"); doc.setFontSize(16);
      doc.text("PokemonBank - Estado de Cuenta", 40, y); y += 22;

      doc.setFont("helvetica",""); doc.setFontSize(11);
      doc.text(`Cliente: ${USER.owner}`, 40, y); y += 16;
      doc.text(`Cuenta: ${USER.account}`, 40, y); y += 16;
      doc.text(`Saldo actual: ${fmt(state.balance)}`, 40, y); y += 22;

      // Tabla simple
      doc.setFontSize(12);
      doc.text("Historial (últimas 20):", 40, y); y += 16;

      const head = ["Fecha","Tipo","Detalle","Monto","Saldo"];
      const colX = [40, 170, 250, 430, 520];

      doc.setFontSize(10);
      head.forEach((h, i)=> doc.text(h, colX[i], y));
      y += 12;

      state.tx.slice(0, 20).forEach(row=>{
        if(y > 760){ doc.addPage(); y = 40; }
        const monto = (row.type==="withdraw"||row.type==="bill")? `-${fmt(row.amount)}` : fmt(row.amount);
        doc.text(String(row.date),  colX[0], y);
        doc.text(labelType(row.type), colX[1], y);
        doc.text(String(row.detail || "-").slice(0,34), colX[2], y);
        doc.text(String(monto),  colX[3], y, {align:"right"});
        doc.text(String(fmt(row.balance)), colX[4], y, {align:"right"});
        y += 12;
      });

      doc.save("estado_cuenta.pdf");
    });
  }

  // -------------------------
  // Vista inicial
  if(state.logged){ show("dash"); } else { show("login"); }
  renderNavUser();
}

// Listo: disparar init cuando cargue el DOM
document.addEventListener("DOMContentLoaded", init);
