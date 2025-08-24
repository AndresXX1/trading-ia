"use client"
import { Box, Card, CardContent, Typography, Button, Chip } from "@mui/material"
import { Star } from "@mui/icons-material"

const PairsWatchlist = ({ watchlist, selectedPair, setSelectedPair, multiPairPrices }) => {
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
          <Star sx={{ mr: 1, verticalAlign: "middle" }} />
          Watchlist
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {watchlist.map((pair) => (
            <Button
              key={pair}
              variant={selectedPair === pair ? "contained" : "outlined"}
              onClick={() => setSelectedPair(pair)}
              size="small"
              sx={{
                borderColor: selectedPair === pair ? "#00ff88" : "rgba(255,255,255,0.3)",
                backgroundColor: selectedPair === pair ? "#00ff88" : "transparent",
                color: selectedPair === pair ? "#000000" : "#ffffff",
                "&:hover": {
                  backgroundColor: selectedPair === pair ? "#00cc66" : "rgba(255,255,255,0.1)",
                },
              }}
            >
              {pair}
              {multiPairPrices[pair] && (
                <Chip
                  label={multiPairPrices[pair].price?.toFixed(pair.includes("JPY") ? 2 : 5)}
                  size="small"
                  sx={{
                    ml: 1,
                    height: "16px",
                    fontSize: "10px",
                    backgroundColor: multiPairPrices[pair].isRealTime ? "#00ff88" : "#ffaa00",
                    color: "#000000",
                  }}
                />
              )}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default PairsWatchlist
