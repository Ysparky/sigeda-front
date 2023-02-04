import { Component, OnInit, forwardRef, EventEmitter, Output, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-text-area',
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextAreaComponent),
      multi: true
    }
  ]
})
export class TextAreaComponent implements ControlValueAccessor {

  @Output() onEnter   : EventEmitter<string> = new EventEmitter();

  @Input() placeholder!: string;

  value!: string;
  isDisabled!: boolean;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: string): void {
    if (value) {
      this.value = value;
    } else {
      this.value = '';
    }
  }

  onInput(event: Event): void {
    const inputEvent = event.target as HTMLInputElement;
    this.value = inputEvent.value;
    this.onChange(this.value);
    this.onTouched();
  }


}
