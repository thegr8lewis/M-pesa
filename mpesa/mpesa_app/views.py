import requests, base64, json, re, os
from datetime import datetime
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseBadRequest
from .models import Transaction
from .forms import PaymentForm
from dotenv import load_dotenv
import traceback 
from django.db import IntegrityError, transaction 

# Load environment variables
load_dotenv()

# Retrieve variables from the environment
CONSUMER_KEY = os.getenv("CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("CONSUMER_SECRET")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE")
CALLBACK_URL = os.getenv("CALLBACK_URL")
MPESA_BASE_URL = os.getenv("MPESA_BASE_URL")



@csrf_exempt
def payment_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            phone = format_phone_number(data["phone_number"])
            amount = data["amount"]
            
            # First initiate STK push with Safaricom
            stk_response = initiate_stk_push(phone, amount)
            
            if stk_response.get("ResponseCode") == "0":
                # Create transaction record in atomic transaction
                try:
                    with transaction.atomic():
                        trans = Transaction.objects.create(
                            amount=amount,
                            checkout_id=stk_response["CheckoutRequestID"],
                            phone_number=phone,
                            status="PENDING"
                        )
                        
                    return JsonResponse({
                        "status": "pending",
                        "checkout_request_id": trans.checkout_id,
                        "message": "STK push initiated successfully"
                    })
                    
                except IntegrityError as e:
                    if "checkout_id" in str(e):
                        # Handle case where checkout_id already exists
                        existing = Transaction.objects.get(
                            checkout_id=stk_response["CheckoutRequestID"]
                        )
                        return JsonResponse({
                            "status": existing.status.lower(),
                            "checkout_request_id": existing.checkout_id,
                            "message": f"Payment already {existing.status.lower()}"
                        })
                    raise
                    
            else:
                error_msg = stk_response.get("errorMessage") or "Failed to initiate payment"
                return JsonResponse({
                    "status": "error",
                    "message": error_msg
                }, status=400)
                
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e),
                "trace": traceback.format_exc()
            }, status=500)
    
    return JsonResponse({
        "error": "Invalid request method"
    }, status=405)

def format_phone_number(phone):
    phone = phone.replace("+", "").replace(" ", "")
    if re.match(r"^254\d{9}$", phone):
        return phone
    elif phone.startswith("0") and len(phone) == 10:
        return "254" + phone[1:]
    else:
        raise ValueError("Invalid phone number format. Use 07... or 254...")

def generate_access_token():
    try:
        credentials = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json",
        }
        response = requests.get(
            f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
            headers=headers,
            timeout=30
        )

        response.raise_for_status()
        data = response.json()
        return data["access_token"]

    except requests.RequestException as e:
        raise Exception(f"Failed to connect to M-Pesa: {str(e)}")

def initiate_stk_push(phone, amount):
    try:
        token = generate_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        stk_password = base64.b64encode(
            (MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).encode()
        ).decode()

        request_body = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": stk_password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": str(int(float(amount))),  # Ensure amount is string and whole number
            "PartyA": phone,
            "PartyB": MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": CALLBACK_URL,
            "AccountReference": "PAYMENT",
            "TransactionDesc": "Payment for services",
        }

        # print("Sending STK Push request:", json.dumps(request_body, indent=2))  # Debug logging

        response = requests.post(
            f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
            json=request_body,
            headers=headers,
            timeout=30
        )

        # print("STK Push response:", response.text)  

        response.raise_for_status()
        return response.json()

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response content: {http_err.response.text}")
        raise Exception(f"HTTP error from M-Pesa: {http_err.response.text}")
    except Exception as e:
        print(f"STK Push Error: {str(e)}")
        raise Exception(f"Failed to initiate STK Push: {str(e)}")

def query_stk_push(checkout_request_id):
    try:
        token = generate_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            (MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).encode()
        ).decode()

        request_body = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        response = requests.post(
            f"{MPESA_BASE_URL}/mpesa/stkpushquery/v1/query",
            json=request_body,
            headers=headers,
            timeout=30
        )

        response.raise_for_status()
        return response.json()

    except requests.RequestException as e:
        print(f"Query Error: {str(e)}")
        return {"error": str(e)}

@csrf_exempt
def stk_status_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            checkout_request_id = data.get('checkout_request_id')
            
            if not checkout_request_id:
                return JsonResponse({
                    "error": "Missing checkout_request_id"
                }, status=400)

            status = query_stk_push(checkout_request_id)
            
            if "error" in status:
                return JsonResponse({
                    "error": status["error"]
                }, status=400)
                
            return JsonResponse({
                "status": status,
                "checkout_request_id": checkout_request_id
            })

        except json.JSONDecodeError:
            return JsonResponse({
                "error": "Invalid JSON body"
            }, status=400)
        except Exception as e:
            return JsonResponse({
                "error": str(e)
            }, status=500)

    return JsonResponse({
        "error": "Invalid request method"
    }, status=405)

@csrf_exempt
def payment_callback(request):
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST requests are allowed")

    try:
        callback_data = json.loads(request.body)
        callback = callback_data["Body"]["stkCallback"]
        result_code = callback["ResultCode"]
        checkout_id = callback["CheckoutRequestID"]
        
        # Try to get existing transaction
        try:
            trans = Transaction.objects.get(checkout_id=checkout_id)
        except Transaction.DoesNotExist:
            return JsonResponse({
                "ResultCode": 1,
                "ResultDesc": "Transaction not found"
            })
        
        if result_code == 0:
            # Successful payment
            metadata = callback["CallbackMetadata"]["Item"]
            
            trans.mpesa_code = next(
                item["Value"] for item in metadata 
                if item["Name"] == "MpesaReceiptNumber"
            )
            trans.amount = next(
                item["Value"] for item in metadata 
                if item["Name"] == "Amount"
            )
            trans.phone_number = next(
                item["Value"] for item in metadata 
                if item["Name"] == "PhoneNumber"
            )
            trans.status = "SUCCESS"
            trans.save()
            
            return JsonResponse({
                "ResultCode": 0,
                "ResultDesc": "Payment successful"
            })
        else:
            # Failed payment
            trans.status = "FAILED"
            trans.save()
            
            return JsonResponse({
                "ResultCode": result_code,
                "ResultDesc": callback.get("ResultDesc", "Payment failed")
            })
            
    except Exception as e:
        return JsonResponse({
            "ResultCode": 1,
            "ResultDesc": f"Error processing callback: {str(e)}"
        })