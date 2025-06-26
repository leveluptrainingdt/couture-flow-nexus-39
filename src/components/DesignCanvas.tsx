
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Canvas as FabricCanvas, Circle, Rect, PencilBrush } from 'fabric';
import { 
  Palette, 
  Pen, 
  Eraser, 
  Square, 
  Circle as CircleIcon, 
  Undo2, 
  Redo2, 
  Grid3X3, 
  ZoomIn, 
  ZoomOut, 
  Save,
  X,
  Layers
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/utils/cloudinaryConfig';

interface DesignCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageUrl: string) => void;
  initialImage?: string;
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  isOpen,
  onClose,
  onSave,
  initialImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'select' | 'rectangle' | 'circle'>('pen');
  const [activeColor, setActiveColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [showGrid, setShowGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    // Initialize drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;
    canvas.isDrawingMode = activeTool === 'pen';

    setFabricCanvas(canvas);

    // Load initial image if provided
    if (initialImage) {
      fabric.Image.fromURL(initialImage, (img) => {
        canvas.add(img);
        canvas.renderAll();
      });
    }

    // Save initial state
    saveState(canvas);

    return () => {
      canvas.dispose();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'pen' || activeTool === 'eraser';
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#ffffff' : activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }

    if (activeTool === 'select') {
      fabricCanvas.selection = true;
    } else {
      fabricCanvas.selection = false;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  const saveState = (canvas: FabricCanvas) => {
    const state = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  };

  const undo = () => {
    if (historyIndex > 0 && fabricCanvas) {
      const prevState = history[historyIndex - 1];
      fabricCanvas.loadFromJSON(prevState, () => {
        fabricCanvas.renderAll();
        setHistoryIndex(prev => prev - 1);
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      const nextState = history[historyIndex + 1];
      fabricCanvas.loadFromJSON(nextState, () => {
        fabricCanvas.renderAll();
        setHistoryIndex(prev => prev + 1);
      });
    }
  };

  const addShape = (type: 'rectangle' | 'circle') => {
    if (!fabricCanvas) return;

    if (type === 'rectangle') {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: activeColor,
        width: 100,
        height: 80,
        stroke: activeColor,
        strokeWidth: 2
      });
      fabricCanvas.add(rect);
    } else if (type === 'circle') {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: 'transparent',
        radius: 50,
        stroke: activeColor,
        strokeWidth: 2
      });
      fabricCanvas.add(circle);
    }

    fabricCanvas.renderAll();
    saveState(fabricCanvas);
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
    // Grid implementation would go here
  };

  const zoomIn = () => {
    if (!fabricCanvas) return;
    const zoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(Math.min(zoom * 1.1, 3));
  };

  const zoomOut = () => {
    if (!fabricCanvas) return;
    const zoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(Math.max(zoom * 0.9, 0.1));
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    setSaving(true);
    try {
      // Convert canvas to blob
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.8
      });
      
      // Convert dataURL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
      // Create file from blob
      const file = new File([blob], 'design-sketch.png', { type: 'image/png' });
      
      // Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(file);
      
      onSave(imageUrl);
      onClose();
      
      toast({
        title: "Success",
        description: "Design saved successfully",
      });
    } catch (error) {
      console.error('Error saving design:', error);
      toast({
        title: "Error",
        description: "Failed to save design",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Design Canvas</span>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            {/* Tools */}
            <div className="flex space-x-1 border rounded-lg p-1">
              <Button
                variant={activeTool === 'select' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTool('select')}
              >
                Select
              </Button>
              <Button
                variant={activeTool === 'pen' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTool('pen')}
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === 'eraser' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTool('eraser')}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Shapes */}
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addShape('rectangle')}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addShape('circle')}
              >
                <CircleIcon className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Colors */}
            <div className="flex space-x-1">
              {colors.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${
                    activeColor === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
              <input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="w-6 h-6 rounded border cursor-pointer"
              />
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Brush Size */}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Size:</span>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-16"
              />
              <span className="text-sm w-6">{brushSize}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* History */}
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-8" />

            {/* View Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleGrid}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-8" />

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Design'}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex justify-center items-center bg-gray-50 p-4">
          <div className="border border-gray-300 shadow-lg">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DesignCanvas;
