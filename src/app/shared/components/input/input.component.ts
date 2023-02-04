import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';


@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {

  @Output() onEnter   : EventEmitter<string> = new EventEmitter();
  @Output() onDebounce: EventEmitter<string> = new EventEmitter();
  debouncer: Subject<string> = new Subject();

  @Input() icon!: string;
  @Input() placeholder!: string;
  @Input() type!: string;
  @Input() label!: string;

  value!: string;
  isDisabled!: boolean;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
    this.debouncer
        .pipe(debounceTime(300))
        .subscribe( value => {
          this.onDebounce.emit( value );
    });
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
    this.keyPressed(this.value)
  }

  keyPressed(term: any) {
    this.debouncer.next( term );
  }


}
