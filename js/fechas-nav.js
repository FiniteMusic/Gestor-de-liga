function iniciarFechas(){
        const contenedor = document.getElementById('fechas-navegacion');

    // Fecha inicial: 22 Nov 2025 (mes 10 = noviembre en JS)
    const start = new Date(2025, 10, 1); //10 Nov 2025
    const end   = new Date(2025, 11, 19); // 19 diciembre 2025

    const diasSemana = ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'];
    const mesesCorto = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const now = new Date(); // fecha actual

    // Recorremos desde start hasta end
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay(); // 0=Domingo, 6=Sábado
        console.log(d);
        // Saltar fines de semana
        // if (day === 0 || day === 6) continue; //paused for general porpuses

        const diaSemana = diasSemana[day];
        const diaNum = d.getDate();
        const mesIdx = d.getMonth();
        const mes = mesesCorto[mesIdx];

        const btn = document.createElement('button');
        btn.className = 'fecha-btn';
        btn.textContent = `${diaSemana} ${diaNum} ${mes}`;

        // Marcar como activo si coincide con la fecha actual (día del mes, mes y año)
        if (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
        ) {
            btn.classList.add('active');
        }

        // Listener para cambiar activo al hacer click
        btn.addEventListener('click', () => {
            document
                .querySelectorAll('.fecha-btn.active')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Opcional: centrar al hacer click
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });

        contenedor.appendChild(btn);
    }

    // Después de crear todos los botones, hacer scroll al activo inicial
    const activeBtn = contenedor.querySelector('.fecha-btn.active');
    if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarFechas();
});