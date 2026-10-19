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
          className={`atlas-city-control atlas-city-environment-control atlas-city-environment-control--${control.label === "Clima" ? "weather" : "lighting"}`}
        >
          <span className="atlas-city-control-label">{control.label}</span>
          <select
            aria-label={`${control.label} da cidade`}
            value={control.value}
            onChange={(event) => control.onChange(event.target.value)}
            disabled={disabled}
            className="atlas-city-select"
          >
            {control.options.map(([value, label]) => (
              <option
                className="atlas-city-select-option"
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
}
