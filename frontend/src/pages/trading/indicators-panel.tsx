"use client"
import { Box, Card, CardContent, Typography, FormControlLabel, Switch } from "@mui/material"
import { Assessment } from "@mui/icons-material"

interface Indicator {
  [key: string]: boolean | undefined;
}

const IndicatorsPanel = ({ indicators, setIndicators }) => {
  return (
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(0,255,255,0.2)",
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, color: "#00ffff" }}>
          <Assessment sx={{ mr: 1, verticalAlign: "middle" }} />
          Indicadores
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Object.entries(indicators)
            .slice(0, 4)
            .map(([key, value]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={value as boolean}
                    onChange={(e) => setIndicators((prev) => ({ ...prev, [key]: e.target.checked }))}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#00ff88",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#00ff88",
                      },
                    }}
                  />
                }
                label={key.toUpperCase()}
                sx={{ color: "#ffffff", m: 0 }}
              />
            ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default IndicatorsPanel
