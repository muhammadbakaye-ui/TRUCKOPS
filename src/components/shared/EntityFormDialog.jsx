import React, { useState, useEffect } from 'react';
import { formatPhone } from '@/utils/phoneFormatter';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function EntityFormDialog({ open, onClose, title, fields, initialData, onSave, saving }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (open) {
      const defaults = {};
      fields.forEach(f => {
        defaults[f.name] = initialData?.[f.name] ?? f.default ?? '';
      });
      setFormData(defaults);
    }
  }, [open, initialData, fields]);

  const handleChange = (name, value, field) => {
    const finalValue = field?.type === 'phone' || field?.name === 'phone'
      ? formatPhone(value)
      : field?.type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 py-3">
            {fields.map(field => {
              if (field.type === 'select') {
                return (
                  <div key={field.name} className={field.fullWidth ? 'col-span-2' : ''}>
                    <Label className="text-xs">{field.label}</Label>
                    <Select
                      value={formData[field.name] || ''}
                      onValueChange={(v) => handleChange(field.name, v)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className="col-span-2">
                    <Label className="text-xs">{field.label}</Label>
                    <Textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value, field)}
                        className="text-xs mt-1 h-20"
                      placeholder={field.placeholder}
                    />
                  </div>
                );
              }
              return (
                <div key={field.name} className={field.fullWidth ? 'col-span-2' : ''}>
                  <Label className="text-xs">{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                  <Input
                    type={field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value, field)}
                    className="h-8 text-xs mt-1"
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {initialData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}