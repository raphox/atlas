export function EnvironmentControls({
  lighting,
  weather,
  onLightingChange,
  onWeatherChange,
  disabled,
}) {
  return (
    <>
      {[
        {
          label: "Iluminação",
          value: lighting,
          onChange: onLightingChange,
          options: [
            ["auto", "Automático"],
            ["twilight", "Nascente/poente"],
            ["day", "Dia"],
            ["night", "Noite"],
          ],
        },
        {
          label: "Clima",
          value: weather,
          onChange: onWeatherChange,
          options: [
            ["auto", "Automático"],
            ["none", "Sem precipitação"],
            ["rain", "Chuva"],
            ["snow", "Neve"],
          ],
        },
      ].map((control) => (
        <label
          key={control.label}
          className="pointer-events-auto flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs has-disabled:opacity-50"
        >
          <span>{control.label}</span>
          <select
            aria-label={`${control.label} da cidade`}
            value={control.value}
            onChange={(event) => control.onChange(event.target.value)}
            disabled={disabled}
            className="min-w-0 cursor-pointer rounded-sm bg-card text-xs outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed"
          >
            {control.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
}
