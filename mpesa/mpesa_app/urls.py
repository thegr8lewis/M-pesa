# from django.urls import path
# from . import views

# urlpatterns = [
#    path('', views.payment_api, name='payment'),
#     path('api/callback/', views.payment_callback, name='payment_callback'),
#     path('api/status/', views.stk_status_view, name='status_check'),  # Changed from stk-status
#     path('api/payment/', views.payment_api, name='payment_api'),  # Consolidated payment endpoints
# ]

from django.urls import path
from . import views

urlpatterns = [
    path('api/payment/', views.payment_api, name='payment_api'),
    path('api/callback/', views.payment_callback, name='payment_callback'),
    path('api/status/', views.stk_status_view, name='status_check'),
]