from django.db import models
from django.core.validators import MinValueValidator

class Transaction(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(1)]  # Minimum 1 KES
    )
    checkout_id = models.CharField(
        max_length=100, 
        unique=True,
        db_index=True
    )
    mpesa_code = models.CharField(
        max_length=100, 
        unique=True,
        null=True,  # Allow null initially
        blank=True
    )
    phone_number = models.CharField(max_length=15)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        status = self.get_status_display()
        return f"{self.checkout_id} - {self.amount} KES ({status})"