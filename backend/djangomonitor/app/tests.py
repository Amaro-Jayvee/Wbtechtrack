from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from app.models import ProductName, Roles, UserProfile
from app.serializers import RequestSerializer


class RequestValidationTests(TestCase):
	def setUp(self):
		self.factory = APIRequestFactory()
		self.admin_user = User.objects.create_user(username="admin_user", password="testpass123")
		UserProfile.objects.create(
			user=self.admin_user,
			full_name="Admin User",
			company_name="WB Tech",
			contact_number="09123456789",
			role=Roles.ADMIN,
			is_verified=True,
		)

		self.customer_user = User.objects.create_user(username="customer_user", password="testpass123")
		UserProfile.objects.create(
			user=self.customer_user,
			full_name="Customer User",
			company_name="Client Co",
			contact_number="09999999999",
			role=Roles.CUSTOMER,
			is_verified=True,
		)

		self.product_a = ProductName.objects.create(prodName="Product A")
		self.product_b = ProductName.objects.create(prodName="Product B")

	def _serializer(self, payload):
		request = self.factory.post("/app/admin/create-request/", payload, format="json")
		request.user = self.admin_user
		return RequestSerializer(data=payload, context={"request": request})

	def test_rejects_quantity_above_50000(self):
		payload = {
			"requester": self.customer_user.id,
			"deadline": (date.today() + timedelta(days=20)).isoformat(),
			"request_products": [
				{
					"product": self.product_a.ProdID,
					"quantity": 50001,
					"deadline_extension": (date.today() + timedelta(days=20)).isoformat(),
				}
			],
		}

		serializer = self._serializer(payload)
		self.assertFalse(serializer.is_valid())
		self.assertIn("request_products", serializer.errors)

	def test_rejects_non_shared_deadlines_across_products(self):
		payload = {
			"requester": self.customer_user.id,
			"deadline": (date.today() + timedelta(days=12)).isoformat(),
			"request_products": [
				{
					"product": self.product_a.ProdID,
					"quantity": 4000,
					"deadline_extension": (date.today() + timedelta(days=12)).isoformat(),
				},
				{
					"product": self.product_b.ProdID,
					"quantity": 3000,
					"deadline_extension": (date.today() + timedelta(days=10)).isoformat(),
				},
			],
		}

		serializer = self._serializer(payload)
		self.assertFalse(serializer.is_valid())
		self.assertIn("deadline", serializer.errors)

	def test_rejects_deadline_too_early_for_large_quantity(self):
		payload = {
			"requester": self.customer_user.id,
			"deadline": (date.today() + timedelta(days=10)).isoformat(),
			"request_products": [
				{
					"product": self.product_a.ProdID,
					"quantity": 32000,
					"deadline_extension": (date.today() + timedelta(days=10)).isoformat(),
				}
			],
		}

		serializer = self._serializer(payload)
		self.assertFalse(serializer.is_valid())
		self.assertIn("deadline", serializer.errors)

	def test_accepts_valid_payload_and_sets_shared_deadline_on_products(self):
		shared_deadline = (date.today() + timedelta(days=16)).isoformat()
		payload = {
			"requester": self.customer_user.id,
			"deadline": shared_deadline,
			"request_products": [
				{
					"product": self.product_a.ProdID,
					"quantity": 2000,
					"deadline_extension": shared_deadline,
				},
				{
					"product": self.product_b.ProdID,
					"quantity": 32000,
					"deadline_extension": shared_deadline,
				},
			],
		}

		serializer = self._serializer(payload)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		created_request = serializer.save()

		self.assertEqual(created_request.request_products.count(), 2)
		for rp in created_request.request_products.all():
			self.assertEqual(rp.deadline_extension.isoformat(), shared_deadline)
			self.assertLessEqual(rp.quantity, 50000)
