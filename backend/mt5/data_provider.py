import MetaTrader5 as mt5
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
import asyncio
import logging

class MT5DataProvider:
    def __init__(self):
        self.connected = False
        self.available_symbols = []
        self.logger = logging.getLogger(__name__)
        
    def connect(self) -> bool:
        """Conectar a MetaTrader 5"""
        try:
            if not mt5.initialize():
                self.logger.error(f"MT5 initialization failed: {mt5.last_error()}")
                return False
            
            self.connected = True
            self.logger.info("Conectado a MetaTrader 5 exitosamente")
            self._load_available_symbols()
            return True
            
        except Exception as e:
            self.logger.error(f"Error connecting to MT5: {e}")
            return False
    
    def disconnect(self):
        """Desconectar de MetaTrader 5"""
        if self.connected:
            mt5.shutdown()
            self.connected = False
            self.logger.info("Desconectado de MetaTrader 5")
    
    def _load_available_symbols(self):
        """Cargar símbolos disponibles"""
        try:
            symbols = mt5.symbols_get()
            if symbols:
                self.available_symbols = [
                    {
                        'symbol': symbol.name,
                        'description': symbol.description,
                        'currency_base': symbol.currency_base,
                        'currency_profit': symbol.currency_profit,
                        'point': symbol.point,
                        'digits': symbol.digits
                    }
                    for symbol in symbols
                    if symbol.visible  # Solo símbolos visibles en Market Watch
                ]
                self.logger.info(f"Cargados {len(self.available_symbols)} símbolos")
        except Exception as e:
            self.logger.error(f"Error loading symbols: {e}")

    def _get_compatible_filling_mode(self, symbol_info):
        """
        Determinar el modo de llenado compatible con el símbolo
        """
        try:
            # Obtener los modos de llenado soportados por el símbolo
            filling_modes = symbol_info.filling_mode
            
            # Priorizar ORDER_FILLING_FOK si está disponible
            if filling_modes & mt5.SYMBOL_FILLING_FOK:
                self.logger.info("Using ORDER_FILLING_FOK")
                return mt5.ORDER_FILLING_FOK
            
            # Si no, usar ORDER_FILLING_IOC
            elif filling_modes & mt5.SYMBOL_FILLING_IOC:
                self.logger.info("Using ORDER_FILLING_IOC") 
                return mt5.ORDER_FILLING_IOC
            
            # Como último recurso, usar RETURN (más compatible)
            else:
                self.logger.info("Using ORDER_FILLING_RETURN (fallback)")
                return mt5.ORDER_FILLING_RETURN
                
        except Exception as e:
            self.logger.warning(f"Error detecting filling mode, using FOK: {e}")
            return mt5.ORDER_FILLING_FOK

    # ========== MÉTODOS DE TRADING ==========

    def execute_order(self, symbol: str, order_type: str, volume: float, 
                     price: float = None, sl: float = None, tp: float = None, 
                     comment: str = "") -> Dict:
        """
        Ejecutar una orden de mercado
        """
        if not self.connected:
            self.logger.error("❌ No conectado a MT5")
            return {"success": False, "error": "Not connected to MT5"}
        
        try:
            # Validar símbolo
            symbol_info = mt5.symbol_info(symbol)
            if symbol_info is None:
                self.logger.error(f"❌ Símbolo {symbol} no encontrado")
                return {"success": False, "error": f"Symbol {symbol} not found"}
            
            # Asegurar que el símbolo está visible
            if not symbol_info.visible:
                self.logger.warning(f"⚠️ Símbolo {symbol} no visible, seleccionando...")
                mt5.symbol_select(symbol, True)

            # Preparar la solicitud de orden
            order_type = order_type.upper()
            if order_type == "BUY":
                trade_type = mt5.ORDER_TYPE_BUY
                tick = mt5.symbol_info_tick(symbol)
                order_price = tick.ask if tick else price
            elif order_type == "SELL":
                trade_type = mt5.ORDER_TYPE_SELL
                tick = mt5.symbol_info_tick(symbol)
                order_price = tick.bid if tick else price
            else:
                return {"success": False, "error": f"Invalid order type: {order_type}"}

            # Usar precio actual si no se proporciona
            if price is None:
                price = order_price

            # Validar volumen
            if volume < symbol_info.volume_min:
                return {"success": False, "error": f"Volume too small. Minimum: {symbol_info.volume_min}"}
            if volume > symbol_info.volume_max:
                return {"success": False, "error": f"Volume too large. Maximum: {symbol_info.volume_max}"}

            # Truncar comentario a máximo 31 caracteres (MT5 limit)
            if comment and len(comment) > 31:
                comment = comment[:31]
            
            # Determinar el tipo de llenado compatible con el símbolo
            filling_mode = self._get_compatible_filling_mode(symbol_info)
            
            # Crear la solicitud de orden
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": volume,
                "type": trade_type,
                "price": price,
                "deviation": 20,
                "magic": 234000,
                "comment": comment,
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling_mode,
            }

            # Agregar SL y TP si se proporcionan
            if sl is not None:
                request["sl"] = sl
            if tp is not None:
                request["tp"] = tp
            
            self.logger.info(f"📤 Enviando orden: {request}")

            # Enviar la orden
            result = mt5.order_send(request)
            
            if result is None:
                error_msg = f"MT5 order_send returned None. Last error: {mt5.last_error()}"
                self.logger.error(error_msg)
                return {"success": False, "error": error_msg}
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                return {
                    "success": False, 
                    "error": f"Order failed: {result.comment}",
                    "retcode": result.retcode
                }
            
            self.logger.info(f"✅ Orden ejecutada exitosamente - Ticket: {result.order}")
            
            return {
                "success": True,
                "ticket": result.order,
                "price": result.price,
                "volume": result.volume,
                "comment": result.comment,
                "message": "Order executed successfully"
            }
                
        except Exception as e:
            self.logger.error(f"Error executing order: {e}")
            return {"success": False, "error": str(e)}

    def place_order(self, symbol: str, order_type: str, volume: float, 
                   price: float = None, sl: float = None, tp: float = None, 
                   comment: str = "") -> Dict:
        """
        Alias para execute_order para compatibilidad
        """
        return self.execute_order(symbol, order_type, volume, price, sl, tp, comment)

    # ========== MÉTODOS EXISTENTES (MANTENER) ==========
    
    def get_available_pairs(self) -> List[Dict]:
        """Obtener pares disponibles para trading"""
        if not self.connected:
            return []
        
        # Filtrar solo pares forex principales
        forex_pairs = []
        major_pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD']
        minor_pairs = ['EURJPY', 'GBPJPY', 'EURGBP', 'EURAUD', 'EURCHF', 'AUDCAD', 'GBPCHF']
        
        for symbol_info in self.available_symbols:
            symbol = symbol_info['symbol']
            if symbol in major_pairs or symbol in minor_pairs:
                forex_pairs.append({
                    **symbol_info,
                    'category': 'Major' if symbol in major_pairs else 'Minor'
                })
        
        return sorted(forex_pairs, key=lambda x: x['symbol'])
    
    def get_realtime_data(self, symbol: str, timeframe: str = "H1", count: int = 500) -> Optional[pd.DataFrame]:
        """Obtener datos en tiempo real"""
        if not self.connected:
            self.logger.error("No hay conexión con MT5")
            return None
        
        try:
            # Mapear timeframes
            tf_map = {
                "M1": mt5.TIMEFRAME_M1,
                "M5": mt5.TIMEFRAME_M5,
                "M15": mt5.TIMEFRAME_M15,
                "M30": mt5.TIMEFRAME_M30,
                "H1": mt5.TIMEFRAME_H1,
                "H4": mt5.TIMEFRAME_H4,
                "D1": mt5.TIMEFRAME_D1,
                "W1": mt5.TIMEFRAME_W1,
                "MN1": mt5.TIMEFRAME_MN1
            }
            
            tf = tf_map.get(timeframe, mt5.TIMEFRAME_H1)
            
            # Obtener datos históricos
            rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
            
            if rates is None or len(rates) == 0:
                self.logger.warning(f"No se pudieron obtener datos para {symbol}")
                return None
            
            # Convertir a DataFrame
            df = pd.DataFrame(rates)
            df['time'] = pd.to_datetime(df['time'], unit='s')
            df.set_index('time', inplace=True)
            
            # Renombrar columnas para consistencia
            df.columns = ['Open', 'High', 'Low', 'Close', 'Volume', 'Spread', 'Real_Volume']
            
            return df[['Open', 'High', 'Low', 'Close', 'Volume']]
            
        except Exception as e:
            self.logger.error(f"Error getting data for {symbol}: {e}")
            return None
    
    def get_current_price(self, symbol: str) -> Optional[Dict]:
        """Obtener precio actual de un símbolo"""
        if not self.connected:
            return None
        
        try:
            tick = mt5.symbol_info_tick(symbol)
            if tick is None:
                return None
            
            return {
                'symbol': symbol,
                'bid': tick.bid,
                'ask': tick.ask,
                'last': tick.last,
                'volume': tick.volume,
                'time': datetime.fromtimestamp(tick.time),
                'spread': tick.ask - tick.bid
            }
        except Exception as e:
            self.logger.error(f"Error getting current price for {symbol}: {e}")
            return None
    
    async def stream_prices(self, symbols: List[str], callback):
        """Stream de precios en tiempo real"""
        while self.connected:
            try:
                prices = {}
                for symbol in symbols:
                    price_data = self.get_current_price(symbol)
                    if price_data:
                        prices[symbol] = price_data
                
                if prices:
                    await callback(prices)
                
                await asyncio.sleep(1)  # Actualizar cada segundo
                
            except Exception as e:
                self.logger.error(f"Error in price stream: {e}")
                await asyncio.sleep(5)
    
    def get_symbol_info(self, symbol: str) -> Optional[Dict]:
        """Obtener información detallada de un símbolo"""
        if not self.connected:
            return None
        
        try:
            info = mt5.symbol_info(symbol)
            if info is None:
                return None
            
            return {
                'symbol': info.name,
                'description': info.description,
                'currency_base': info.currency_base,
                'currency_profit': info.currency_profit,
                'point': info.point,
                'digits': info.digits,
                'spread': info.spread,
                'volume_min': info.volume_min,
                'volume_max': info.volume_max,
                'volume_step': info.volume_step,
                'margin_initial': info.margin_initial,
                'trade_mode': info.trade_mode
            }
        except Exception as e:
            self.logger.error(f"Error getting symbol info for {symbol}: {e}")
            return None