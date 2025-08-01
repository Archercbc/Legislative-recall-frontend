import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  agreeTerms: boolean;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
      agreeTerms: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';

      const formData: ContactForm = this.contactForm.value;

      // 這裡可以調用後端API發送表單數據
      // 目前先模擬發送成功
      setTimeout(() => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        
        // 顯示成功訊息
        alert('感謝您的意見回饋！我們會盡快回覆您。');
        
        // 重置表單
        this.resetForm();
      }, 2000);

      // 實際的API調用（當後端準備好時）
      /*
      this.http.post(`${environment.apiUrl}/api/contact`, formData)
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.submitSuccess = true;
            alert('感謝您的意見回饋！我們會盡快回覆您。');
            this.resetForm();
          },
          error: (error) => {
            this.isSubmitting = false;
            this.submitError = '發送失敗，請稍後再試。';
            console.error('發送表單失敗:', error);
          }
        });
      */
    } else {
      // 標記所有字段為已觸碰，以顯示錯誤訊息
      Object.keys(this.contactForm.controls).forEach(key => {
        const control = this.contactForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  resetForm(): void {
    this.contactForm.reset();
    this.submitSuccess = false;
    this.submitError = '';
  }
}
