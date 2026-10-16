import type { ChecklistItem } from "./model";
export function ChecklistEditor({ template, items, owner }: { template: { id: string; label: string }[]; items?: ChecklistItem[]; owner: string }) {
  return <fieldset className="pilot-checklist"><legend>Checklist de preparación</legend>
    <p className="muted">Guía documental a validar con el equipo. No acredita cumplimiento legal.</p>
    {template.map(item => {
      const saved = items?.find(saved => saved.id === item.id);
      return <div className="pilot-task" key={item.id}>
        <label className="pilot-checkbox"><input type="checkbox" name={`task-${item.id}-done`} defaultChecked={saved?.done ?? false} />{item.label}</label>
        <label htmlFor={`task-${item.id}-owner`}>Responsable de {item.label}</label>
        <input id={`task-${item.id}-owner`} name={`task-${item.id}-owner`} defaultValue={saved?.owner ?? owner} required maxLength={200} />
        <label htmlFor={`task-${item.id}-due`}>Fecha objetivo de {item.label}</label>
        <input id={`task-${item.id}-due`} name={`task-${item.id}-due`} type="date" defaultValue={saved?.dueDate ?? ""} />
      </div>;
    })}
  </fieldset>;
}
