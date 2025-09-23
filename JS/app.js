/* Usuario de demostración */
const USER = {
  pin: "2025",                 // PIN de acceso
  owner: "Henry Peña",         // Nombre del dueño de la cuenta
  account: "001-234-567",       // Número de cuenta
  balance: 1500.00              // Saldo inicial
};

/* Función para seleccionar elementos del DOM rápidamente */
const el = sel => document.querySelector(sel);

/* Función para formatear los números como moneda en dólares USD */
const fmt = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/* Estado de la aplicación (saldo, transacciones, login) */
let state = {
  logged: false,
  balance: USER.balance,
  tx: [] // cada transacción: {fecha, tipo, detalle, monto, saldo}
};

/* Guardar el estado en localStorage */
const KEY = "pokemonback-demo";
function save(){
  localStorage.setItem(KEY, JSON.stringify(state));
}
/* Cargar el estado desde localStorage */
function load(){
  const s = localStorage.getItem(KEY);
  if(s){
    try{ state = JSON.parse(s); }catch(e){}
  } else {
    save();
  }
}

/* Mostrar nombre y cuenta en la barra superior */
function renderNavUser(){
  el("#navUser").textContent = state.logged ? `${USER.owner} · ${USER.account}` : "";
}

/* Mostrar u ocultar vistas */
function show(view){
  el("#view-login").classList.add("d-none");
  el("#view-dashboard").classList.add("d-none");
  if(view==="login") el("#view-login").classList.remove("d-none");
  if(view==="dash") el("#view-dashboard").classList.remove("d-none");
}

/* Mostrar los datos del usuario y saldo en la cabecera */
function renderHeader(){
  el("#ownerName").textContent = USER.owner;
  el("#accountNumber").textContent = USER.account;
  el("#balance").textContent = fmt(state.balance);
}

/* Agregar una transacción al historial */
function addTx(type, detail, amount){
  const tx = {
    date: new Date().toLocaleString("es-SV"),
    type, detail,
    amount: Number(amount),
    balance: state.balance
  };
  state.tx.unshift(tx); // insertar al inicio
  save();
  renderHistory();
  updateChart();
}

/* Tabla de historial de transacciones */
function renderHistory(){
  const tbody = el("#historyBody");
  tbody.innerHTML = state.tx.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${labelType(t.type)}</td>
      <td>${t.detail || "-"}</td>
      <td class="text-right">${(t.type==="withdraw"||t.type==="bill")?"-":""}${fmt(t.amount)}</td>
      <td class="text-right">${fmt(t.balance)}</td>
    </tr>
  `).join("");
}

/* Etiquetas para los tipos de transacción */
function labelType(t){
  return {
    deposit: "Depósito",
    withdraw: "Retiro",
    check: "Consulta",
    bill: "Pago servicio"
  }[t] || t;
}

/* Inicializar el gráfico con Chart.js */
let chart;
function initChart(){
  const ctx = document.getElementById("txChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Depósitos","Retiros","Pagos","Consultas"],
      datasets: [{
        data: [0,0,0,0],
        // Colores personalizados para cada tipo de transacción
        backgroundColor: [
          "#28a745", // verde para Depósitos
          "#dc3545", // rojo para Retiros
          "#007bff", // azul para Pagos
          "#ffc107"  // amarillo para Consultas
        ],
        borderColor: "#ffffff", // borde blanco entre sectores
        borderWidth: 2
      }]
    },
    options: {
      legend: { position: "bottom" }
    }
  });
  updateChart();
}


/* Actualizar datos del gráfico según historial */
function updateChart(){
  const counts = {deposit:0, withdraw:0, bill:0, check:0};
  state.tx.forEach(t => counts[t.type] = (counts[t.type]||0) + 1);
  chart.data.datasets[0].data = [counts.deposit, counts.withdraw, counts.bill, counts.check];
  chart.update();
}

/* Reglas de validación solo para montos (usamos ValidateJS para montos) */
const amountConstraints = { presence: {allowEmpty:false}, numericality: {greaterThan: 0} };

/* Función principal: inicializa eventos y renderiza todo */
function init(){
  load();
  renderNavUser();
  renderHeader();
  renderHistory();
  initChart();

  /* LOGIN — validación manual del PIN */
  el("#loginForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const pin = el("#pin").value.trim();

    // Comprobamos que tenga 4 dígitos numéricos
    if(!/^\d{4}$/.test(pin)){
      el("#pin").classList.add("is-invalid");
      return;
    }
    el("#pin").classList.remove("is-invalid");

    // Verificar PIN correcto
    if(pin !== USER.pin){
      swal("PIN incorrecto", "Intenta nuevamente.", "error");
      return;
    }

    // Si es correcto, mostrar dashboard
    state.logged = true;
    save();
    renderNavUser();
    show("dash");
    renderHeader();
  });

  /* BOTÓN Salir (Logout) */
  el("#btnLogout").addEventListener("click", ()=>{
    swal({
      title: "¿Está seguro de que desea salir?",
      text: "Se cerrará la sesión actual.",
      icon: "warning",
      buttons: ["Cancelar", "Sí, salir"],
      dangerMode: true
    }).then(ok => {
      if(ok){
        state.logged = false;
        save();
        renderNavUser();
        show("login");
      }
    });
  });

  /* BOTÓN Descargar estado de Cuenta (PDF) */
  el("#btnDownloadStatement").addEventListener("click", ()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Estado de Cuenta - PokemonBank", 20, 20);
    doc.setFontSize(12);
    doc.text(`Titular: ${USER.owner}`, 20, 30);
    doc.text(`Cuenta: ${USER.account}`, 20, 37);
    doc.text(`Saldo actual: ${fmt(state.balance)}`, 20, 44);
    doc.text("Historial de transacciones:", 20, 54);
    let y = 62;
    state.tx.slice(0, 20).forEach((t, i) => {
      doc.text(`${i+1}. ${t.date} | ${labelType(t.type)} | ${t.detail || "-"} | ${fmt(t.amount)} | ${fmt(t.balance)}` , 20, y);
      y += 7;
      if(y > 270) { doc.addPage(); y = 20; }
    });
    doc.save("EstadoCuenta_PokemonBank.pdf");
  });

  /* Mostrar/ocultar campos según tipo de transacción */
  const actionType = el("#actionType");
  const serviceGroup = el("#serviceGroup");
  const amountGroup = el("#amountGroup");
  actionType.addEventListener("change", ()=>{
    const v = actionType.value;
    serviceGroup.classList.toggle("d-none", v !== "bill");
    amountGroup.classList.toggle("d-none", v === "check");
  });

  /* Ejecutar transacciones */
  el("#actionForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const type = actionType.value;
    const amount = parseFloat(el("#amount").value);
    const service = el("#serviceType").value;

    // Validar monto solo cuando no sea consulta
    if(type !== "check"){
      const err = validate({amount}, {amount: amountConstraints});
      if(err){
        el("#amount").classList.add("is-invalid");
        return;
      }
      el("#amount").classList.remove("is-invalid");
    }

    // Lógica de cada transacción
    if(type === "deposit"){
      state.balance += amount;
      addTx("deposit", "Depósito en ventanilla ATM", amount);
      // Al hacer un depósito exitoso
      swal("Depósito exitoso", `Nuevo saldo: ${fmt(state.balance)}`, "success");
    }else if(type === "withdraw"){
      if(amount > state.balance){
        // Al intentar retirar más del saldo disponible
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
  });

  /* Botón Limpiar historial */
  el("#btnClearHistory").addEventListener("click", ()=>{
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
  
  /* Estado inicial (si ya estaba logueado */
  if(state.logged){ show("dash"); } else { show("login"); }
  renderNavUser();
  // Forzar cambio para mostrar u ocultar campos del formulario
  actionType && actionType.dispatchEvent(new Event("change"));
}

/* Ejecutar la inicialización cuando el DOM esté listo */
document.addEventListener("DOMContentLoaded", init);
