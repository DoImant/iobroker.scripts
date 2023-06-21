//
// Setzen von Datenpunkten für Daten der SensEgg Sensoren
// Wenn ein Datenpunkt nicht vorhanden ist, wird er angelegt.
// 
// @param sensID: ID-String
// @param value: Zahlenwert
// @param role: Art des Datenpunktes
// @param acknowledge: Wert besträtigt (true) oder nicht bestätigt (false)
//
export async function setSensIDState(sensId: string, value: number, role: string, acknowledge: boolean) {
    if (!existsState(sensId)) {
        await createStateAsync(sensId, 0, false, { name: 'min', role: role, type: 'number' });
        log('Id: ' + sensId + ' created', 'info');
    }
    setState(sensId, value, acknowledge);
}
